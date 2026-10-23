import { Rider, RiderStatus } from '@/types/database';
import { fleetRepository, IFleetRepository } from './fleet.repository';
import { CreateRiderDto, UpdateRiderDto, BulkAssignDto } from './fleet.types';
import { ordersRepository } from '../orders/orders.repository';
import { realtimeHub } from '@/lib/realtimeSync';

export class FleetService {
  constructor(private repo: IFleetRepository = fleetRepository) {}

  async listRiders(filter?: { outletId?: string; status?: RiderStatus | 'ALL' }): Promise<Rider[]> {
    return await this.repo.findAll(filter);
  }

  async getRiderById(id: string): Promise<Rider | null> {
    return await this.repo.findById(id);
  }

  async registerRider(dto: CreateRiderDto): Promise<Rider> {
    const newRider: Rider = {
      id: `rider-${Date.now()}`,
      name: dto.name,
      phone: dto.phone,
      outletId: dto.outletId,
      vehicle: dto.vehicle,
      status: dto.status || 'AVAILABLE',
      rating: dto.rating || 4.8,
      baseDeliveredCount: dto.baseDeliveredCount || 0,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    return await this.repo.create(newRider);
  }

  async updateRiderStatus(id: string, status: RiderStatus): Promise<Rider | null> {
    return await this.repo.update(id, { status });
  }

  async bulkAssignRider(dto: BulkAssignDto): Promise<{ success: boolean; count: number; rider: Rider }> {
    const rider = await this.repo.findById(dto.riderId);
    if (!rider) {
      throw new Error(`Rider ${dto.riderId} not found`);
    }

    const newStatus = dto.autoDispatch ? 'OUT_FOR_DELIVERY' : undefined;

    for (const orderId of dto.orderIds) {
      await ordersRepository.update(orderId, {
        riderId: rider.id,
        riderName: rider.name,
        riderPhone: rider.phone,
        ...(newStatus ? { orderStatus: newStatus } : {}),
      });

      realtimeHub.broadcast({
        type: 'ORDER_STATUS_UPDATED',
        orderId,
        status: newStatus || 'PREPARING',
        riderName: rider.name,
      });
    }

    // Set rider duty state to ON_DELIVERY
    await this.repo.update(rider.id, { status: 'ON_DELIVERY' });

    return {
      success: true,
      count: dto.orderIds.length,
      rider,
    };
  }
}

export const fleetService = new FleetService();
