import { MenuItem } from '@/types/database';
import { menuRepository, IMenuRepository } from './menu.repository';
import { MenuFilter, CreateMenuItemDto, UpdateMenuItemDto } from './menu.types';

export class MenuService {
  constructor(private repo: IMenuRepository = menuRepository) {}

  async listMenuItems(filter?: MenuFilter): Promise<MenuItem[]> {
    return await this.repo.findAll(filter);
  }

  async getMenuItemById(id: string): Promise<MenuItem | null> {
    return await this.repo.findById(id);
  }

  async createMenuItem(dto: CreateMenuItemDto): Promise<MenuItem> {
    const id = dto.id || `item-${Date.now()}`;
    const slug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const newItem: MenuItem = {
      ...dto,
      id,
      slug,
      rating: dto.rating ?? 4.8,
      ratingCount: dto.ratingCount ?? 1,
      prepTimeMin: dto.prepTimeMin ?? 8,
      isVeg: dto.isVeg ?? true,
      outletId: dto.outletId || 'outlet-bhawarkua',
      isAvailableTonight: dto.isAvailableTonight ?? true,
    };

    return await this.repo.create(newItem);
  }

  async updateMenuItem(id: string, updates: UpdateMenuItemDto): Promise<MenuItem | null> {
    return await this.repo.update(id, updates);
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    return await this.repo.delete(id);
  }
}

export const menuService = new MenuService();
