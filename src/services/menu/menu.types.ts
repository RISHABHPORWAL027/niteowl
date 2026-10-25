import { MenuItem, ItemCategory } from '@/types/database';

export interface MenuFilter {
  category?: ItemCategory | string;
  search?: string;
  isVeg?: boolean;
  outletId?: string;
}

export type CreateMenuItemDto = Omit<MenuItem, 'id'> & { id?: string };
export type UpdateMenuItemDto = Partial<CreateMenuItemDto>;

export interface ToggleMenuItemDto {
  isAvailableTonight: boolean;
}
