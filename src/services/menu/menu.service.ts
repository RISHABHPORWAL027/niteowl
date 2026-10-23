import { MenuItem } from '@/types/database';
import { menuRepository, IMenuRepository } from './menu.repository';
import { MenuFilter } from './menu.types';

export class MenuService {
  constructor(private repo: IMenuRepository = menuRepository) {}

  async listMenuItems(filter?: MenuFilter): Promise<MenuItem[]> {
    let items = await this.repo.findAll(filter?.category);

    if (filter?.isVeg !== undefined) {
      items = items.filter((i) => i.isVeg === filter.isVeg);
    }

    if (filter?.search?.trim()) {
      const q = filter.search.toLowerCase().trim();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      );
    }

    return items;
  }

  async getMenuItemById(id: string): Promise<MenuItem | null> {
    return await this.repo.findById(id);
  }
}

export const menuService = new MenuService();
