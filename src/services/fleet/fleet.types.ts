import { Rider, RiderStatus } from '@/types/database';

export interface CreateRiderDto {
  name: string;
  phone: string;
  outletId: string;
  vehicle: string;
  status?: RiderStatus;
  rating?: number;
  baseDeliveredCount?: number;
}

export interface UpdateRiderDto {
  status?: RiderStatus;
  rating?: number;
  vehicle?: string;
  phone?: string;
}

export interface BulkAssignDto {
  orderIds: string[];
  riderId: string;
  autoDispatch?: boolean;
}
