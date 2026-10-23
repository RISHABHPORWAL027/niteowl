import { MenuItem, ItemCategory } from '@/types/database';

export interface MenuFilter {
  category?: ItemCategory | string;
  search?: string;
  isVeg?: boolean;
}

export interface ToggleMenuItemDto {
  isAvailableTonight: boolean;
}
