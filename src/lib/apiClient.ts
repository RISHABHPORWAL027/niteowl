// NiteOwl Microservices Client Gateway
// Typed client for interacting with decoupled backend microservices

import { Order, OrderStatus, Outlet, Rider, RiderStatus, Zone, MenuItem, SavedAddress } from '@/types/database';
import { CreateOrderDto, UpdateOrderDto, OrderFilter } from '@/services/orders/orders.types';
import { CreateRiderDto, BulkAssignDto } from '@/services/fleet/fleet.types';
import { MenuFilter, CreateMenuItemDto, UpdateMenuItemDto } from '@/services/menu/menu.types';
import { CreateAddressDto, UpdateAddressDto } from '@/services/addresses/addresses.types';

export const apiClient = {
  // Addresses Microservice
  addresses: {
    list: async (userId?: string): Promise<{ success: boolean; addresses: SavedAddress[]; count: number }> => {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      const res = await fetch(`/api/addresses?${params.toString()}`);
      if (!res.ok) throw new Error(`Addresses fetch failed: ${res.statusText}`);
      return await res.json();
    },

    getById: async (id: string): Promise<SavedAddress | null> => {
      const res = await fetch(`/api/addresses/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.address || null;
    },

    create: async (dto: CreateAddressDto): Promise<SavedAddress> => {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create address');
      }
      return data.address;
    },

    update: async (id: string, dto: UpdateAddressDto): Promise<SavedAddress> => {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update address');
      }
      return data.address;
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(res.ok && data.success);
    },
  },

  // Orders Microservice
  orders: {
    list: async (filter?: OrderFilter): Promise<{ success: boolean; orders: Order[]; count: number }> => {
      const params = new URLSearchParams();
      if (filter?.outletId) params.append('outletId', filter.outletId);
      if (filter?.status) params.append('status', filter.status);
      if (filter?.zoneId) params.append('zoneId', filter.zoneId);
      if (filter?.riderId) params.append('riderId', filter.riderId);
      if (filter?.timeRange) params.append('timeRange', filter.timeRange);
      if (filter?.limit) params.append('limit', String(filter.limit));
      if (filter?.search) params.append('search', filter.search);

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error(`Orders fetch failed: ${res.statusText}`);
      return await res.json();
    },

    getById: async (id: string): Promise<Order | null> => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.order || null;
    },

    create: async (dto: CreateOrderDto): Promise<Order> => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order');
      }
      return data.order;
    },

    update: async (id: string, dto: UpdateOrderDto): Promise<Order> => {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order');
      }
      return data.order;
    },
  },

  // Hubs & Kitchens Microservice
  hubs: {
    list: async (): Promise<{ success: boolean; outlets: Outlet[]; zones: Record<string, Zone[]> }> => {
      const res = await fetch('/api/hubs');
      if (!res.ok) throw new Error(`Hubs fetch failed: ${res.statusText}`);
      return await res.json();
    },

    toggleStore: async (outletId: string): Promise<Outlet> => {
      const res = await fetch(`/api/hubs/${outletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleStore' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle store');
      return data.outlet;
    },

    toggleRush: async (outletId: string): Promise<Outlet> => {
      const res = await fetch(`/api/hubs/${outletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleRush' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle rush');
      return data.outlet;
    },

    toggleZone: async (outletId: string, zoneId: string): Promise<Zone> => {
      const res = await fetch(`/api/hubs/${outletId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggleZone', zoneId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to toggle zone');
      return data.zone;
    },
  },

  // Fleet & Logistics Microservice
  fleet: {
    list: async (filter?: { outletId?: string; status?: RiderStatus | 'ALL' }): Promise<{ success: boolean; riders: Rider[] }> => {
      const params = new URLSearchParams();
      if (filter?.outletId) params.append('outletId', filter.outletId);
      if (filter?.status) params.append('status', filter.status);

      const res = await fetch(`/api/riders?${params.toString()}`);
      if (!res.ok) throw new Error(`Fleet fetch failed: ${res.statusText}`);
      return await res.json();
    },

    getById: async (id: string): Promise<Rider | null> => {
      const res = await fetch(`/api/riders/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.rider || null;
    },

    register: async (dto: CreateRiderDto): Promise<Rider> => {
      const res = await fetch('/api/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to register pilot');
      return data.rider;
    },

    updateStatus: async (id: string, status: RiderStatus): Promise<Rider> => {
      const res = await fetch(`/api/riders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update pilot status');
      return data.rider;
    },

    bulkAssign: async (orderIds: string[], riderId: string, autoDispatch?: boolean): Promise<{ success: boolean; count: number; rider: Rider }> => {
      const res = await fetch('/api/riders/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds, riderId, autoDispatch }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to assign pilot');
      return data;
    },
  },

  // Menu Microservice
  menu: {
    list: async (filter?: MenuFilter): Promise<{ success: boolean; items: MenuItem[]; count: number }> => {
      const params = new URLSearchParams();
      if (filter?.outletId) params.append('outletId', filter.outletId);
      if (filter?.category) params.append('category', filter.category);
      if (filter?.isVeg !== undefined) params.append('isVeg', String(filter.isVeg));
      if (filter?.search) params.append('search', filter.search);

      const res = await fetch(`/api/menu?${params.toString()}`);
      if (!res.ok) throw new Error(`Menu fetch failed: ${res.statusText}`);
      return await res.json();
    },

    getById: async (id: string): Promise<MenuItem | null> => {
      const res = await fetch(`/api/menu/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.item || null;
    },

    create: async (dto: CreateMenuItemDto): Promise<MenuItem> => {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create menu item');
      }
      return data.item;
    },

    update: async (id: string, dto: UpdateMenuItemDto): Promise<MenuItem> => {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update menu item');
      }
      return data.item;
    },

    delete: async (id: string): Promise<boolean> => {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(res.ok && data.success);
    },
  },

  // Payments Microservice
  payments: {
    createOrder: async (amount: number, notes?: Record<string, any>) => {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes }),
      });
      return await res.json();
    },

    verifyPayment: async (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      const res = await fetch('/api/razorpay/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    },
  },
};
