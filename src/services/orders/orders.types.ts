import { Order, OrderStatus, PaymentMethod, PaymentStatus, CustomerAddressDetails, OrderCartItem } from '@/types/database';

export interface OrderFilter {
  outletId?: string;
  status?: OrderStatus | 'ALL';
  zoneId?: string;
  riderId?: string;
  timeRange?: 'DAILY' | 'WEEKLY' | 'ALL';
  search?: string;
  limit?: number;
}

export interface CreateOrderDto {
  outletId: string;
  zoneId: string;
  customerName: string;
  customerPhone: string;
  addressDetails: CustomerAddressDetails;
  items: OrderCartItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  discount?: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  estimatedMins?: number;
}

export interface UpdateOrderDto {
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  estimatedMins?: number;
}
