// Zustand State Store with Persist Middleware for NiteOwl Hyper-Local Architecture

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  MenuItem,
  Order,
  OrderCartItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Outlet,
  Zone,
  Rider,
  RiderStatus,
  SavedAddress,
} from '@/types/database';
import {
  INITIAL_ORDERS,
  INITIAL_OUTLETS,
  INITIAL_ZONES,
  INITIAL_RIDERS,
  MOCK_MENU_ITEMS,
} from '@/lib/mockData';
import {
  calculateDistanceKm,
  resolveZoneByCoords,
  resolveZoneByLandmark,
} from '@/lib/geometry';
import { realtimeHub } from '@/lib/realtimeSync';
import { apiClient } from '@/lib/apiClient';

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  imageUrl?: string;
  customization?: string;
}

export interface CustomerUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
}

export type { SavedAddress };

export interface NiteOwlState {
  // Customer Auth State
  customerUser: CustomerUser | null;
  isCustomerAuthenticated: boolean;
  setCustomerUser: (user: CustomerUser | null) => void;
  updateCustomerDisplayName: (name: string) => void;
  customerLogout: () => void;

  // Saved Addresses
  savedAddresses: SavedAddress[];
  activeAddress: SavedAddress | null;
  fetchAddresses: (userId?: string) => Promise<void>;
  addSavedAddress: (addr: Omit<SavedAddress, 'id'>) => Promise<SavedAddress>;
  updateSavedAddress: (addressId: string, updatedData: Partial<Omit<SavedAddress, 'id'>>) => Promise<void>;
  deleteSavedAddress: (addressId: string) => Promise<void>;
  selectSavedAddress: (addressId: string) => void;

  // Outlets & Zones
  outlets: Outlet[];
  zonesMap: Record<string, Zone[]>;
  currentOutlet: Outlet;
  currentZone: Zone;

  // Location & Geofencing
  selectedLandmark: string;
  userCoords: { lat: number; lng: number } | null;
  distanceKm: number;
  isOutOfDelivery: boolean;
  zoneResolutionMessage: string | null;

  // Menu Catalog
  menuItems: MenuItem[];
  selectedCategory: string;
  fetchMenuItems: (outletId?: string, category?: string) => Promise<void>;

  // Cart State
  cart: CartItem[];
  packagingFee: number;
  appliedDiscount: number;

  // Live Orders (Simulated backend state)
  orders: Order[];
  activeOrder: Order | null;

  // Computations
  getCartSubtotal: () => number;
  getDeliveryFee: () => number;
  getMinOrderValue: () => number;
  isMinOrderMet: () => boolean;
  getRemainingForMinOrder: () => number;
  getTotal: () => number;
  getCartItemCount: () => number;

  // Actions - Customer
  addToCart: (item: MenuItem, customization?: string) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  reorderItems: (items: OrderCartItem[]) => void;
  setActiveOrder: (order: Order | null) => void;
  setSelectedCategory: (category: string) => void;

  // Actions - Location & Zone Resolver
  resolveByCoords: (lat: number, lng: number) => void;
  selectLandmarkManual: (landmark: string) => void;
  setOutlet: (outletId: string) => void;
  setZone: (zoneId: string) => void;

  // Admin Auth State
  isAdminAuthenticated: boolean;
  adminLogin: (passcode: string) => boolean;
  adminLogout: () => void;

  // Actions - Hub Manager Zone Control
  toggleZoneActive: (outletId: string, zoneId: string) => void;
  toggleStoreOpen: (outletId: string) => void;
  toggleRushPaused: (outletId: string) => void;

  // Riders Fleet Management
  riders: Rider[];
  addRider: (rider: Omit<Rider, 'id'>) => void;
  updateRiderStatus: (riderId: string, status: RiderStatus) => void;
  bulkAssignRider: (
    orderIds: string[],
    riderId: string,
    options?: { updateStatus?: OrderStatus }
  ) => void;
  assignRiderToOrder: (
    orderId: string,
    riderId: string,
    options?: { updateStatus?: OrderStatus }
  ) => void;

  updateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    extra?: { riderName?: string; riderPhone?: string; riderId?: string }
  ) => void;
  placeOrder: (details: {
    customerName: string;
    customerPhone: string;
    hostelPgOrFlat: string;
    roomNo: string;
    landmark: string;
    leaveAtGate: boolean;
    silentDelivery: boolean;
    maskedCall: boolean;
    riderNotes?: string;
    paymentMethod?: PaymentMethod;
    paymentStatus?: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }) => Order;
  syncWithBackend: () => Promise<void>;
}

export const useNiteOwlStore = create<NiteOwlState>()(
  persist(
    (set, get) => ({
      outlets: INITIAL_OUTLETS,
      zonesMap: INITIAL_ZONES,
      currentOutlet: INITIAL_OUTLETS[0], // Bhawarkua Hub
      currentZone: INITIAL_ZONES['outlet-bhawarkua'][0], // Zone 1 Bholaram
      selectedLandmark: 'Bholaram Ustad Marg',
      userCoords: { lat: 22.6938, lng: 75.8654 }, // ~380m from Bhawarkua hub (Zone 1)
      distanceKm: 0.38,
      isOutOfDelivery: false,
      zoneResolutionMessage: null,

      menuItems: MOCK_MENU_ITEMS,
      selectedCategory: 'ALL',

      cart: [],
      packagingFee: 5,
      appliedDiscount: 0,

      orders: INITIAL_ORDERS,
      activeOrder: null,
      riders: INITIAL_RIDERS,

      // Customer Auth State
      customerUser: null,
      isCustomerAuthenticated: false,
      setCustomerUser: (user: CustomerUser | null) => {
        set({
          customerUser: user,
          isCustomerAuthenticated: Boolean(user),
        });
        if (user) {
          get().fetchAddresses(user.uid);
        }
      },
      updateCustomerDisplayName: (name: string) => {
        const { customerUser } = get();
        if (customerUser) {
          set({
            customerUser: {
              ...customerUser,
              displayName: name.trim() || 'Midnight Foodiee',
            },
          });
        }
      },
      customerLogout: () => {
        set({
          customerUser: null,
          isCustomerAuthenticated: false,
          activeOrder: null,
          savedAddresses: [],
          activeAddress: null,
        });
      },

      // Saved Addresses (Fetched from backend)
      savedAddresses: [],
      activeAddress: null,

      // Admin Auth State
      isAdminAuthenticated: false,
      adminLogin: (passcode: string) => {
        // Authenticated state is set upon verified response from /api/admin/login
        if (passcode.trim()) {
          set({ isAdminAuthenticated: true });
          return true;
        }
        return false;
      },
      adminLogout: () => {
        set({ isAdminAuthenticated: false });
      },

      // Computed Selectors
      getCartSubtotal: () => {
        const { cart } = get();
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getMinOrderValue: () => {
        const { currentZone } = get();
        return currentZone?.minOrderValue ?? 89;
      },

      isMinOrderMet: () => {
        const subtotal = get().getCartSubtotal();
        const minOrder = get().getMinOrderValue();
        return subtotal >= minOrder;
      },

      getRemainingForMinOrder: () => {
        const subtotal = get().getCartSubtotal();
        const minOrder = get().getMinOrderValue();
        return Math.max(0, minOrder - subtotal);
      },

      getDeliveryFee: () => {
        const { currentZone } = get();
        if (!currentZone) return 0;
        const subtotal = get().getCartSubtotal();
        // Check if free delivery threshold is reached
        if (
          currentZone.freeDeliveryThreshold &&
          subtotal >= currentZone.freeDeliveryThreshold
        ) {
          return 0;
        }
        return currentZone.deliveryFee;
      },

      getTotal: () => {
        const subtotal = get().getCartSubtotal();
        const deliveryFee = get().getDeliveryFee();
        const { packagingFee, appliedDiscount } = get();
        return Math.max(0, subtotal + deliveryFee + packagingFee - appliedDiscount);
      },

      getCartItemCount: () => {
        const { cart } = get();
        return cart.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Cart Actions
      addToCart: (item: MenuItem, customization?: string) => {
        set((state) => {
          const existingIndex = state.cart.findIndex(
            (c) => c.menuItemId === item.id
          );
          if (existingIndex > -1) {
            const updated = [...state.cart];
            updated[existingIndex].quantity += 1;
            return { cart: updated };
          }
          return {
            cart: [
              ...state.cart,
              {
                menuItemId: item.id,
                name: item.name,
                price: item.basePrice,
                quantity: 1,
                isVeg: item.isVeg,
                imageUrl: item.imageUrl,
                customization,
              },
            ],
          };
        });
      },

      removeFromCart: (menuItemId: string) => {
        set((state) => ({
          cart: state.cart.filter((c) => c.menuItemId !== menuItemId),
        }));
      },

      updateQuantity: (menuItemId: string, delta: number) => {
        set((state) => {
          const updated = state.cart
            .map((item) => {
              if (item.menuItemId === menuItemId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
              }
              return item;
            })
            .filter((item): item is CartItem => item !== null);
          return { cart: updated };
        });
      },

      clearCart: () => {
        set({ cart: [] });
      },

      reorderItems: (items: OrderCartItem[]) => {
        set((state) => {
          const newCart = [...state.cart];
          items.forEach((it) => {
            const existingIndex = newCart.findIndex(
              (c) => c.menuItemId === it.menuItemId
            );
            if (existingIndex > -1) {
              newCart[existingIndex].quantity += it.quantity;
            } else {
              newCart.push({
                menuItemId: it.menuItemId,
                name: it.name,
                price: it.price,
                quantity: it.quantity,
                isVeg: it.isVeg,
                imageUrl: it.imageUrl,
                customization: it.customization,
              });
            }
          });
          return { cart: newCart };
        });
      },

      setActiveOrder: (order: Order | null) => {
        set({ activeOrder: order });
      },

      setSelectedCategory: (category: string) => {
        set({ selectedCategory: category });
      },

      // Location & Zone Resolver Actions
      resolveByCoords: (lat: number, lng: number) => {
        const { outlets, zonesMap } = get();
        const result = resolveZoneByCoords(lat, lng, outlets, zonesMap);

        if (!result) return;

        set({
          userCoords: { lat, lng },
          currentOutlet: result.outlet,
          currentZone: result.zone,
          distanceKm: result.distanceKm,
          isOutOfDelivery: !result.isCovered,
          zoneResolutionMessage: result.message ?? null,
        });
      },

      selectLandmarkManual: (landmark: string) => {
        const { outlets, zonesMap } = get();
        const result = resolveZoneByLandmark(landmark, outlets, zonesMap);

        if (!result) return;

        set({
          selectedLandmark: landmark,
          currentOutlet: result.outlet,
          currentZone: result.zone,
          distanceKm: result.distanceKm,
          isOutOfDelivery: !result.isCovered,
          zoneResolutionMessage: result.message ?? null,
        });
      },

      fetchMenuItems: async (outletId?: string, category?: string) => {
        try {
          const res = await apiClient.menu.list({
            outletId: outletId || get().currentOutlet.id,
            category: category && category !== 'ALL' ? category : undefined,
          });
          if (res?.success && Array.isArray(res.items)) {
            set({ menuItems: res.items });
          }
        } catch (err) {
          console.warn('[Microservice Sync] Fetch menu error:', err);
        }
      },

      fetchAddresses: async (userId?: string) => {
        try {
          const targetUid = userId || get().customerUser?.uid;
          const res = await apiClient.addresses.list(targetUid);
          if (res?.success && Array.isArray(res.addresses)) {
            set((state) => {
              const active =
                state.activeAddress && res.addresses.some((a) => a.id === state.activeAddress?.id)
                  ? state.activeAddress
                  : res.addresses[0] || null;

              let targetOutlet = state.currentOutlet;
              let targetZone = state.currentZone;
              let distanceKm = state.distanceKm;
              let isOutOfDelivery = state.isOutOfDelivery;
              let selectedLandmark = state.selectedLandmark;

              if (active) {
                selectedLandmark = active.building || active.landmark;
                if (active.lat && active.lng) {
                  const resolved = resolveZoneByCoords(active.lat, active.lng, state.outlets, state.zonesMap);
                  if (resolved) {
                    targetOutlet = resolved.outlet;
                    targetZone = resolved.zone;
                    distanceKm = resolved.distanceKm;
                    isOutOfDelivery = !resolved.isCovered;
                  }
                }
              }

              return {
                savedAddresses: res.addresses,
                activeAddress: active,
                selectedLandmark,
                currentOutlet: targetOutlet,
                currentZone: targetZone,
                distanceKm,
                isOutOfDelivery,
              };
            });
          }
        } catch (err) {
          console.warn('[Microservice Sync] Fetch addresses error:', err);
        }
      },

      addSavedAddress: async (addrData) => {
        let createdAddr: SavedAddress;
        try {
          createdAddr = await apiClient.addresses.create({
            ...addrData,
            userId: get().customerUser?.uid,
          });
        } catch (err) {
          console.warn('[Microservice Sync] Create address error, fallback locally:', err);
          createdAddr = {
            id: `addr-${Date.now()}`,
            userId: get().customerUser?.uid,
            ...addrData,
          };
        }

        const { outlets, zonesMap } = get();
        let targetOutlet = get().currentOutlet;
        let targetZone = get().currentZone;
        let distanceKm = get().distanceKm;
        let isOutOfDelivery = false;

        if (createdAddr.lat && createdAddr.lng) {
          const res = resolveZoneByCoords(createdAddr.lat, createdAddr.lng, outlets, zonesMap);
          if (res) {
            targetOutlet = res.outlet;
            targetZone = res.zone;
            distanceKm = res.distanceKm;
            isOutOfDelivery = !res.isCovered;
          }
        } else if (createdAddr.landmark) {
          const res = resolveZoneByLandmark(createdAddr.landmark, outlets, zonesMap);
          if (res) {
            targetOutlet = res.outlet;
            targetZone = res.zone;
            distanceKm = res.distanceKm;
            isOutOfDelivery = !res.isCovered;
          }
        }

        set((state) => ({
          savedAddresses: [createdAddr, ...state.savedAddresses.filter((a) => a.id !== createdAddr.id)],
          activeAddress: createdAddr,
          selectedLandmark: createdAddr.building || createdAddr.landmark,
          currentOutlet: targetOutlet,
          currentZone: targetZone,
          distanceKm,
          isOutOfDelivery,
        }));

        return createdAddr;
      },

      selectSavedAddress: (addressId: string) => {
        const found = get().savedAddresses.find((a) => a.id === addressId);
        if (!found) return;

        const { outlets, zonesMap } = get();
        let targetOutlet = get().currentOutlet;
        let targetZone = get().currentZone;
        let distanceKm = get().distanceKm;
        let isOutOfDelivery = false;

        if (found.lat && found.lng) {
          const res = resolveZoneByCoords(found.lat, found.lng, outlets, zonesMap);
          if (res) {
            targetOutlet = res.outlet;
            targetZone = res.zone;
            distanceKm = res.distanceKm;
            isOutOfDelivery = !res.isCovered;
          }
        } else {
          const res = resolveZoneByLandmark(found.landmark, outlets, zonesMap);
          if (res) {
            targetOutlet = res.outlet;
            targetZone = res.zone;
            distanceKm = res.distanceKm;
            isOutOfDelivery = !res.isCovered;
          }
        }

        set({
          activeAddress: found,
          selectedLandmark: found.building || found.landmark,
          currentOutlet: targetOutlet,
          currentZone: targetZone,
          distanceKm,
          isOutOfDelivery,
        });
      },

      updateSavedAddress: async (addressId: string, updatedData: Partial<Omit<SavedAddress, 'id'>>) => {
        const { savedAddresses, outlets, zonesMap, activeAddress } = get();
        const existing = savedAddresses.find((a) => a.id === addressId);
        if (!existing) return;

        const updated: SavedAddress = {
          ...existing,
          ...updatedData,
          formattedAddress:
            updatedData.formattedAddress ||
            `${(updatedData.houseNo ?? existing.houseNo).trim()}, ${(updatedData.building ?? existing.building).trim()}, ${(updatedData.street ?? existing.street).trim()}, Indore`,
        };

        apiClient.addresses.update(addressId, updatedData).catch((err) => {
          console.warn('[Microservice Sync] Update address error:', err);
        });

        const newSaved = savedAddresses.map((a) => (a.id === addressId ? updated : a));

        let stateUpdates: Partial<NiteOwlState> = {
          savedAddresses: newSaved,
        };

        if (activeAddress?.id === addressId) {
          let targetOutlet = get().currentOutlet;
          let targetZone = get().currentZone;
          let distanceKm = get().distanceKm;
          let isOutOfDelivery = false;

          if (updated.lat && updated.lng) {
            const res = resolveZoneByCoords(updated.lat, updated.lng, outlets, zonesMap);
            if (res) {
              targetOutlet = res.outlet;
              targetZone = res.zone;
              distanceKm = res.distanceKm;
              isOutOfDelivery = !res.isCovered;
            }
          }

          stateUpdates = {
            ...stateUpdates,
            activeAddress: updated,
            selectedLandmark: updated.building || updated.landmark,
            currentOutlet: targetOutlet,
            currentZone: targetZone,
            distanceKm,
            isOutOfDelivery,
          };
        }

        set(stateUpdates);
      },

      deleteSavedAddress: async (addressId: string) => {
        apiClient.addresses.delete(addressId).catch((err) => {
          console.warn('[Microservice Sync] Delete address error:', err);
        });

        const { savedAddresses, activeAddress } = get();
        const filtered = savedAddresses.filter((a) => a.id !== addressId);
        const nextActive =
          activeAddress?.id === addressId ? filtered[0] || null : activeAddress;

        set({
          savedAddresses: filtered,
          activeAddress: nextActive,
        });
      },

      setOutlet: (outletId: string) => {
        const { outlets, zonesMap } = get();
        const outlet = outlets.find((o) => o.id === outletId);
        if (!outlet) return;
        const outletZones = zonesMap[outletId] || [];
        const zone = outletZones[0] || get().currentZone;

        set({
          currentOutlet: outlet,
          currentZone: zone,
          selectedLandmark: zone.landmarksCovered[0] || 'Hub Center',
        });
      },

      setZone: (zoneId: string) => {
        const { currentOutlet, zonesMap } = get();
        const zones = zonesMap[currentOutlet.id] || [];
        const zone = zones.find((z) => z.id === zoneId);
        if (zone) {
          set({
            currentZone: zone,
            selectedLandmark: zone.landmarksCovered[0] || zone.name,
            zoneResolutionMessage: zone.isActive
              ? null
              : `${zone.name} is paused tonight.`,
          });
        }
      },

      // Hub Manager Actions
      toggleZoneActive: (outletId: string, zoneId: string) => {
        apiClient.hubs.toggleZone(outletId, zoneId).catch((err) => {
          console.warn('[Microservice Sync] Hub toggleZone error:', err);
        });
        set((state) => {
          const outletZones = state.zonesMap[outletId] || [];
          const updatedZones = outletZones.map((z) =>
            z.id === zoneId ? { ...z, isActive: !z.isActive } : z
          );

          const newZonesMap = {
            ...state.zonesMap,
            [outletId]: updatedZones,
          };

          // If current zone was updated, update currentZone in state
          let newCurrentZone = state.currentZone;
          let newResolutionMsg = state.zoneResolutionMessage;
          if (state.currentZone.id === zoneId) {
            const matching = updatedZones.find((z) => z.id === zoneId);
            if (matching) {
              newCurrentZone = matching;
              newResolutionMsg = matching.isActive
                ? null
                : `${matching.name} has been paused by the kitchen manager due to surge.`;
            }
          }

          return {
            zonesMap: newZonesMap,
            currentZone: newCurrentZone,
            zoneResolutionMessage: newResolutionMsg,
          };
        });
      },

      toggleStoreOpen: (outletId: string) => {
        apiClient.hubs.toggleStore(outletId).catch((err) => {
          console.warn('[Microservice Sync] Hub toggleStore error:', err);
        });
        set((state) => {
          const updatedOutlets = state.outlets.map((o) =>
            o.id === outletId ? { ...o, isStoreOpen: !o.isStoreOpen } : o
          );
          const current = updatedOutlets.find((o) => o.id === state.currentOutlet.id);
          return {
            outlets: updatedOutlets,
            currentOutlet: current || state.currentOutlet,
          };
        });
      },

      toggleRushPaused: (outletId: string) => {
        apiClient.hubs.toggleRush(outletId).catch((err) => {
          console.warn('[Microservice Sync] Hub toggleRush error:', err);
        });
        set((state) => {
          const updatedOutlets = state.outlets.map((o) =>
            o.id === outletId ? { ...o, isRushPaused: !o.isRushPaused } : o
          );
          const current = updatedOutlets.find((o) => o.id === state.currentOutlet.id);
          return {
            outlets: updatedOutlets,
            currentOutlet: current || state.currentOutlet,
          };
        });
      },

      addRider: (riderData) => {
        const newRider: Rider = {
          ...riderData,
          id: `rider-${Date.now()}`,
          baseDeliveredCount: riderData.baseDeliveredCount || 0,
        };
        set((state) => ({
          riders: [...(state.riders || INITIAL_RIDERS), newRider],
        }));
      },

      updateRiderStatus: (riderId, status) => {
        apiClient.fleet.updateStatus(riderId, status).catch((err) => {
          console.warn('[Microservice Sync] Rider status update error:', err);
        });
        set((state) => ({
          riders: (state.riders || INITIAL_RIDERS).map((r) =>
            r.id === riderId ? { ...r, status } : r
          ),
        }));
      },

      bulkAssignRider: (orderIds, riderId, options) => {
        const state = get();
        const allRiders = state.riders?.length ? state.riders : INITIAL_RIDERS;
        const rider = allRiders.find((r) => r.id === riderId);
        if (!rider) return;

        set((s) => {
          const currentRiders = s.riders?.length ? s.riders : INITIAL_RIDERS;
          
          // Track previous riders of the orders being reassigned
          const previousRiderIds = new Set<string>();
          s.orders.forEach((o) => {
            if (orderIds.includes(o.id) && o.riderId && o.riderId !== riderId) {
              previousRiderIds.add(o.riderId);
            }
          });

          const updatedOrders = s.orders.map((o) => {
            if (orderIds.includes(o.id)) {
              return {
                ...o,
                riderId: rider.id,
                riderName: rider.name,
                riderPhone: rider.phone,
                ...(options?.updateStatus ? { orderStatus: options.updateStatus } : {}),
              };
            }
            return o;
          });

          const active =
            s.activeOrder && orderIds.includes(s.activeOrder.id)
              ? {
                  ...s.activeOrder,
                  riderId: rider.id,
                  riderName: rider.name,
                  riderPhone: rider.phone,
                  ...(options?.updateStatus ? { orderStatus: options.updateStatus } : {}),
                }
              : s.activeOrder;

          // Set new rider duty state to ON_DELIVERY.
          // For any previous riders, if they have no other active deliveries left, revert to AVAILABLE.
          const updatedRiders = currentRiders.map((r) => {
            if (r.id === riderId) {
              return { ...r, status: 'ON_DELIVERY' as RiderStatus };
            }
            if (previousRiderIds.has(r.id)) {
              const remainingActive = updatedOrders.filter(
                (o) =>
                  o.riderId === r.id &&
                  o.orderStatus !== 'DELIVERED' &&
                  o.orderStatus !== 'CANCELLED'
              );
              if (remainingActive.length === 0) {
                return { ...r, status: 'AVAILABLE' as RiderStatus };
              }
            }
            return r;
          });

          return {
            orders: updatedOrders,
            activeOrder: active,
            riders: updatedRiders,
          };
        });

        // Realtime broadcast for updated orders
        orderIds.forEach((id) => {
          const updated = get().orders.find((o) => o.id === id);
          if (updated) {
            realtimeHub.broadcast({
              type: 'ORDER_STATUS_UPDATED',
              orderId: id,
              status: updated.orderStatus,
              riderName: rider.name,
            });
          }
        });

        apiClient.fleet
          .bulkAssign(orderIds, riderId, Boolean(options?.updateStatus === 'OUT_FOR_DELIVERY'))
          .catch((err) => {
            console.warn('[Microservice Sync] Bulk assign rider error:', err);
          });
      },

      assignRiderToOrder: (orderId, riderId, options) => {
        get().bulkAssignRider([orderId], riderId, options);
      },

      updateOrderStatus: (
        orderId: string,
        newStatus: OrderStatus,
        extra?: { riderName?: string; riderPhone?: string; riderId?: string }
      ) => {
        set((state) => {
          const updatedOrders = state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  orderStatus: newStatus,
                  ...(extra?.riderId ? { riderId: extra.riderId } : {}),
                  ...(extra?.riderName ? { riderName: extra.riderName } : {}),
                  ...(extra?.riderPhone ? { riderPhone: extra.riderPhone } : {}),
                }
              : o
          );
          const active =
            state.activeOrder?.id === orderId
              ? {
                  ...state.activeOrder,
                  orderStatus: newStatus,
                  ...(extra?.riderId ? { riderId: extra.riderId } : {}),
                  ...(extra?.riderName ? { riderName: extra.riderName } : {}),
                  ...(extra?.riderPhone ? { riderPhone: extra.riderPhone } : {}),
                }
              : state.activeOrder;

          // If order is delivered, check if rider has any more active deliveries
          let updatedRiders = state.riders || INITIAL_RIDERS;
          if (newStatus === 'DELIVERED') {
            const deliveredOrder = state.orders.find((o) => o.id === orderId);
            const riderName = extra?.riderName || deliveredOrder?.riderName;
            if (riderName) {
              const remainingActiveForRider = updatedOrders.filter(
                (o) =>
                  (o.riderName === riderName || o.riderId === deliveredOrder?.riderId) &&
                  o.orderStatus !== 'DELIVERED' &&
                  o.orderStatus !== 'CANCELLED'
              );
              if (remainingActiveForRider.length === 0) {
                updatedRiders = updatedRiders.map((r) =>
                  r.name === riderName || r.id === deliveredOrder?.riderId
                    ? { ...r, status: 'AVAILABLE' as RiderStatus }
                    : r
                );
              }
            }
          }

          return { orders: updatedOrders, activeOrder: active, riders: updatedRiders };
        });

        realtimeHub.broadcast({
          type: 'ORDER_STATUS_UPDATED',
          orderId,
          status: newStatus,
          riderName: extra?.riderName,
        });

        apiClient.orders
          .update(orderId, {
            orderStatus: newStatus,
            ...(extra?.riderName ? { riderName: extra.riderName } : {}),
            ...(extra?.riderPhone ? { riderPhone: extra.riderPhone } : {}),
          })
          .catch((err) => {
            console.warn('[Microservice Sync] Update order status error:', err);
          });
      },

      placeOrder: (details) => {
        const state = get();
        const subtotal = state.getCartSubtotal();
        const deliveryFee = state.getDeliveryFee();
        const total = state.getTotal();

        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `NO-${state.currentOutlet.name.substring(0, 3).toUpperCase()}-${randomNum}`;

        const newOrder: Order = {
          id: `ord-${Date.now()}`,
          orderNumber,
          outletId: state.currentOutlet.id,
          zoneId: state.currentZone.id,
          customerName: details.customerName,
          customerPhone: details.customerPhone,
          addressDetails: {
            hostelPgOrFlat: details.hostelPgOrFlat,
            roomNo: details.roomNo,
            landmark: details.landmark,
            leaveAtGate: details.leaveAtGate,
            silentDelivery: details.silentDelivery,
            maskedCall: details.maskedCall,
            riderNotes: details.riderNotes,
          },
          items: state.cart.map((c) => ({
            menuItemId: c.menuItemId,
            name: c.name,
            price: c.price,
            quantity: c.quantity,
            isVeg: c.isVeg,
            customization: c.customization,
          })),
          subtotal,
          deliveryFee,
          packagingFee: state.packagingFee,
          discount: state.appliedDiscount,
          total,
          orderStatus: 'PLACED',
          paymentMethod: details.paymentMethod || 'RAZORPAY',
          paymentStatus: details.paymentStatus || 'PAID',
          razorpayOrderId: details.razorpayOrderId,
          razorpayPaymentId: details.razorpayPaymentId,
          riderName: 'Pilot assigning...',
          estimatedMins: state.currentZone.estimatedDeliveryMins,
          createdAt: new Date().toISOString(),
        };

        set({
          orders: [newOrder, ...state.orders],
          activeOrder: newOrder,
          cart: [], // Clear cart upon successful order
        });

        realtimeHub.broadcast({
          type: 'ORDER_PLACED',
          order: newOrder,
        });

        apiClient.orders
          .create({
            outletId: newOrder.outletId,
            zoneId: newOrder.zoneId,
            customerName: newOrder.customerName,
            customerPhone: newOrder.customerPhone,
            addressDetails: newOrder.addressDetails,
            items: newOrder.items,
            subtotal: newOrder.subtotal,
            deliveryFee: newOrder.deliveryFee,
            packagingFee: newOrder.packagingFee,
            discount: newOrder.discount,
            total: newOrder.total,
            paymentMethod: newOrder.paymentMethod,
            paymentStatus: newOrder.paymentStatus,
            razorpayOrderId: newOrder.razorpayOrderId,
            razorpayPaymentId: newOrder.razorpayPaymentId,
            estimatedMins: newOrder.estimatedMins,
          })
          .catch((err) => {
            console.warn('[Microservice Sync] Create order error:', err);
          });

        return newOrder;
      },

      syncWithBackend: async () => {
        try {
          const currentHubId = get().currentOutlet?.id || 'outlet-bhawarkua';
          const userId = get().customerUser?.uid;

          const [ordersRes, hubsRes, fleetRes, menuRes, addrRes] = await Promise.all([
            apiClient.orders.list().catch(() => null),
            apiClient.hubs.list().catch(() => null),
            apiClient.fleet.list().catch(() => null),
            apiClient.menu.list({ outletId: currentHubId }).catch(() => null),
            apiClient.addresses.list(userId).catch(() => null),
          ]);

          set((state) => {
            const updates: Partial<NiteOwlState> = {};
            if (ordersRes?.success && Array.isArray(ordersRes.orders)) {
              updates.orders = ordersRes.orders;
            }
            if (hubsRes?.success && hubsRes.outlets && hubsRes.outlets.length > 0) {
              updates.outlets = hubsRes.outlets;
              if (hubsRes.zones) updates.zonesMap = hubsRes.zones;
            }
            if (fleetRes?.success && fleetRes.riders && fleetRes.riders.length > 0) {
              updates.riders = fleetRes.riders;
            }
            if (menuRes?.success && menuRes.items && menuRes.items.length > 0) {
              updates.menuItems = menuRes.items;
            }
            if (addrRes?.success && Array.isArray(addrRes.addresses)) {
              updates.savedAddresses = addrRes.addresses;
              if (!state.activeAddress && addrRes.addresses.length > 0) {
                updates.activeAddress = addrRes.addresses[0];
                updates.selectedLandmark = addrRes.addresses[0].building || addrRes.addresses[0].landmark;
              }
            }
            return updates;
          });
        } catch (err) {
          console.warn('[Microservice Sync] Background sync warning:', err);
        }
      },
    }),
    {
      name: 'niteowl-storage',
      partialize: (state) => ({
        cart: state.cart,
        selectedLandmark: state.selectedLandmark,
        currentOutlet: state.currentOutlet,
        currentZone: state.currentZone,
        orders: state.orders,
        activeOrder: state.activeOrder,
        isAdminAuthenticated: state.isAdminAuthenticated,
        customerUser: state.customerUser,
        isCustomerAuthenticated: state.isCustomerAuthenticated,
        savedAddresses: state.savedAddresses,
        activeAddress: state.activeAddress,
        riders: state.riders,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Purge legacy mock addresses from localstorage
          if (state.savedAddresses) {
            state.savedAddresses = state.savedAddresses.filter(
              (a) => !a.id.startsWith('addr-default-')
            );
          }
          // Ensure only Bhawarkua hub is active
          state.outlets = INITIAL_OUTLETS;
          state.zonesMap = INITIAL_ZONES;
          state.currentOutlet = INITIAL_OUTLETS[0];
          if (!state.currentZone || !INITIAL_ZONES['outlet-bhawarkua'].some((z) => z.id === state.currentZone.id)) {
            state.currentZone = INITIAL_ZONES['outlet-bhawarkua'][0];
          } else {
            state.currentZone.minOrderValue = 89;
          }
          if (state.orders) {
            // Purge legacy mock orders starting with ord-894 and ensure only Bhawarkua orders
            state.orders = state.orders.filter(
              (o) => !o.id.startsWith('ord-894') && (!o.outletId || o.outletId === 'outlet-bhawarkua')
            );
          }
          if (state.riders) {
            // Keep only Bhawarkua riders
            state.riders = state.riders.filter(
              (r) => !r.outletId || r.outletId === 'outlet-bhawarkua'
            );
          }
          // Normalize default customer name from generic/student to creative Foodiee name
          if (
            state.customerUser &&
            (!state.customerUser.displayName ||
              state.customerUser.displayName.toLowerCase().includes('student') ||
              state.customerUser.displayName.startsWith('Customer') ||
              state.customerUser.displayName === 'Midnight Diner Member' ||
              state.customerUser.displayName === 'NiteOwl Diner')
          ) {
            state.customerUser.displayName = 'Midnight Foodiee';
          }
        }
      },
    }
  )
);

// Subscribe to cross-tab realtime events to synchronize active orders & status
if (typeof window !== 'undefined') {
  realtimeHub.subscribe((msg) => {
    if (msg.type === 'ORDER_STATUS_UPDATED') {
      const state = useNiteOwlStore.getState();
      const updatedOrders = state.orders.map((o) =>
        o.id === msg.orderId
          ? {
              ...o,
              orderStatus: msg.status,
              ...(msg.riderName ? { riderName: msg.riderName } : {}),
            }
          : o
      );
      const active =
        state.activeOrder?.id === msg.orderId
          ? {
              ...state.activeOrder,
              orderStatus: msg.status,
              ...(msg.riderName ? { riderName: msg.riderName } : {}),
            }
          : state.activeOrder;
      useNiteOwlStore.setState({ orders: updatedOrders, activeOrder: active });
    } else if (msg.type === 'ORDER_PLACED') {
      const state = useNiteOwlStore.getState();
      if (!state.orders.some((o) => o.id === msg.order.id)) {
        useNiteOwlStore.setState({ orders: [msg.order, ...state.orders] });
      }
    }
  });
}
