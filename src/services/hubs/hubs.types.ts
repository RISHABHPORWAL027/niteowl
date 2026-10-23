import { Outlet, Zone } from '@/types/database';

export interface UpdateOutletDto {
  isStoreOpen?: boolean;
  isRushPaused?: boolean;
  surgeMultiplier?: number;
}

export interface UpdateZoneDto {
  isActive?: boolean;
  deliveryFee?: number;
  minOrderValue?: number;
}
