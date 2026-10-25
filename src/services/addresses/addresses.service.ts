import { SavedAddress } from '@/types/database';
import { addressesRepository, IAddressesRepository } from './addresses.repository';
import { CreateAddressDto, UpdateAddressDto, AddressFilter } from './addresses.types';

export class AddressesService {
  constructor(private repo: IAddressesRepository = addressesRepository) {}

  async listAddresses(filter?: AddressFilter): Promise<SavedAddress[]> {
    return await this.repo.findAll(filter);
  }

  async getAddressById(id: string): Promise<SavedAddress | null> {
    return await this.repo.findById(id);
  }

  async createAddress(dto: CreateAddressDto, userId?: string): Promise<SavedAddress> {
    const id = `addr-${Date.now()}`;
    const newAddress: SavedAddress = {
      id,
      userId: userId || dto.userId,
      tag: dto.tag || 'Home',
      houseNo: dto.houseNo?.trim() || '',
      building: dto.building?.trim() || '',
      street: dto.street?.trim() || '',
      landmark: dto.landmark?.trim() || dto.street?.trim() || '',
      lat: dto.lat,
      lng: dto.lng,
      formattedAddress:
        dto.formattedAddress ||
        `${dto.houseNo ? `${dto.houseNo}, ` : ''}${dto.building ? `${dto.building}, ` : ''}${dto.street}, Indore`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await this.repo.create(newAddress);
  }

  async updateAddress(id: string, dto: UpdateAddressDto): Promise<SavedAddress | null> {
    return await this.repo.update(id, dto);
  }

  async deleteAddress(id: string): Promise<boolean> {
    return await this.repo.delete(id);
  }
}

export const addressesService = new AddressesService();
