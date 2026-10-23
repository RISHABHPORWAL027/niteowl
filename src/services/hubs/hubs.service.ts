import { Outlet, Zone } from '@/types/database';
import { hubsRepository, IHubsRepository } from './hubs.repository';
import { UpdateOutletDto, UpdateZoneDto } from './hubs.types';

export class HubsService {
  constructor(private repo: IHubsRepository = hubsRepository) {}

  async getOutlets(): Promise<Outlet[]> {
    return await this.repo.findOutlets();
  }

  async getOutletById(id: string): Promise<Outlet | null> {
    return await this.repo.findOutletById(id);
  }

  async getZones(outletId?: string): Promise<Record<string, Zone[]>> {
    return await this.repo.findZones(outletId);
  }

  async toggleStoreOpen(outletId: string): Promise<Outlet | null> {
    const current = await this.repo.findOutletById(outletId);
    if (!current) throw new Error(`Outlet ${outletId} not found`);

    return await this.repo.updateOutlet(outletId, {
      isStoreOpen: !current.isStoreOpen,
    });
  }

  async toggleRushPaused(outletId: string): Promise<Outlet | null> {
    const current = await this.repo.findOutletById(outletId);
    if (!current) throw new Error(`Outlet ${outletId} not found`);

    return await this.repo.updateOutlet(outletId, {
      isRushPaused: !current.isRushPaused,
    });
  }

  async toggleZoneActive(outletId: string, zoneId: string): Promise<Zone | null> {
    const zones = await this.repo.findZones(outletId);
    const list = zones[outletId] || [];
    const zone = list.find((z) => z.id === zoneId);
    if (!zone) throw new Error(`Zone ${zoneId} not found`);

    return await this.repo.updateZone(outletId, zoneId, {
      isActive: !zone.isActive,
    });
  }
}

export const hubsService = new HubsService();
