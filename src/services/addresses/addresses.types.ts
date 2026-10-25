import { SavedAddress } from '@/types/database';

export type CreateAddressDto = Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateAddressDto = Partial<CreateAddressDto>;

export interface AddressFilter {
  userId?: string;
  tag?: string;
}
