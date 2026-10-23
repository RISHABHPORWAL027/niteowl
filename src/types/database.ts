// TypeScript Domain Models & Database Types for NiteOwl

export type ZoneCode = 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'CUSTOM';

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'UPI_QR' | 'UPI_INTENT' | 'CASH_ON_DELIVERY' | 'RAZORPAY';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type ItemCategory =
  | 'ALL'
  | 'MAGGI_NOODLES'
  | 'CHAI_COFFEE'
  | 'SANDWICHES_BURGERS'
  | 'ROLLS_WRAPS'
  | 'QUICK_BITES'
  | 'DESSERTS_BEVERAGES';

export interface Outlet {
  id: string;
  name: string; // e.g., "Bhawarkua Hub"
  slug: string;
  address: string;
  lat: number;
  lng: number;
  openingTime: string; // "19:00"
  closingTime: string; // "04:00"
  isStoreOpen: boolean;
  isRushPaused: boolean;
  surgeMultiplier: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Zone {
  id: string;
  outletId: string;
  name: string; // e.g., "Zone 1: Bholaram Core"
  zoneCode: ZoneCode;
  radiusKm: number; // 0.8, 1.5, 2.0
  minRadiusKm?: number; // 0.0, 0.8, 1.5
  landmarksCovered: string[]; // ["Bholaram", "Radha Krishna Residency", ...]
  minOrderValue: number; // default ₹89
  deliveryFee: number; // e.g., ₹0 for Zone 1, ₹15 for Zone 3
  freeDeliveryThreshold?: number; // e.g., ₹149
  estimatedDeliveryMins: number; // e.g., 15
  isActive: boolean; // hub manager toggle
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  category: ItemCategory;
  description: string;
  basePrice: number;
  imageUrl: string;
  isVeg: boolean;
  rating: number;
  ratingCount: number;
  prepTimeMin: number;
  tag?: string; // e.g., "Bestseller", "Midnight Fuel", "Midnight Special"
}

export interface OutletInventory {
  id: string;
  outletId: string;
  menuItemId: string;
  price: number;
  isAvailableTonight: boolean;
  stockQuantity?: number;
}

export interface CustomerAddressDetails {
  hostelPgOrFlat: string; // Apartment, Building, Flat, or House
  roomNo: string; // Flat, Floor, or Unit number
  floor?: string;
  landmark: string;
  leaveAtGate: boolean;
  silentDelivery: boolean;
  maskedCall: boolean;
  riderNotes?: string;
}

export type HostelAddressDetails = CustomerAddressDetails;

export interface OrderCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  imageUrl?: string;
  customization?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  outletId: string;
  zoneId: string;
  customerName: string;
  customerPhone: string;
  addressDetails: HostelAddressDetails;
  items: OrderCartItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  discount: number;
  total: number;
  orderStatus: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  estimatedMins: number;
  createdAt: string;
  updatedAt?: string;
}

export type RiderStatus = 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  outletId: string; // Hub id
  preferredZoneCodes?: ZoneCode[];
  vehicle: string;
  status: RiderStatus;
  rating: number;
  baseDeliveredCount: number; // Historical completed deliveries
  joinedDate?: string;
  avatarUrl?: string;
}

// Location and Geolocation types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ResolvedZoneResult {
  outlet: Outlet;
  zone: Zone;
  distanceKm: number;
  isCovered: boolean;
  isZoneActive: boolean;
  message?: string;
}
