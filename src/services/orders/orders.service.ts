import { Order, OrderStatus } from '@/types/database';
import { ordersRepository, IOrdersRepository } from './orders.repository';
import { CreateOrderDto, OrderFilter, UpdateOrderDto } from './orders.types';
import { realtimeHub } from '@/lib/realtimeSync';
import { menuRepository } from '@/services/menu/menu.repository';

export class OrdersService {
  constructor(private repo: IOrdersRepository = ordersRepository) {}

  async listOrders(filter?: OrderFilter): Promise<Order[]> {
    return await this.repo.findAll(filter);
  }

  async getOrderById(id: string): Promise<Order | null> {
    return await this.repo.findById(id);
  }

  async placeOrder(dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }
    if (!dto.outletId) {
      throw new Error('Outlet ID is required');
    }
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new Error('Customer name is required');
    }
    if (!dto.customerPhone || !dto.customerPhone.trim()) {
      throw new Error('Customer phone number is required');
    }
    let verifiedSubtotal = 0;
    const verifiedItems = await Promise.all(
      dto.items.map(async (item) => {
        const dbItem = await menuRepository.findById(item.menuItemId);
        const unitPrice = dbItem ? dbItem.basePrice : Number(item.price || 0);
        const qty = Math.max(1, Number(item.quantity || 1));
        verifiedSubtotal += unitPrice * qty;
        return {
          ...item,
          price: unitPrice,
          quantity: qty,
        };
      })
    );

    if (verifiedSubtotal < 89) {
      throw new Error('Minimum order value is ₹89. Subtotal is below minimum threshold.');
    }

    const deliveryFee = typeof dto.deliveryFee === 'number' ? dto.deliveryFee : 15;
    const packagingFee = typeof dto.packagingFee === 'number' ? dto.packagingFee : 10;
    const discount = typeof dto.discount === 'number' ? dto.discount : 0;
    const verifiedTotal = verifiedSubtotal + deliveryFee + packagingFee - discount;

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = dto.outletId.includes('vijay')
      ? 'VJN'
      : dto.outletId.includes('geeta')
      ? 'GTB'
      : 'BHA';
    const orderNumber = `NO-${prefix}-${randomNum}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber,
      outletId: dto.outletId,
      zoneId: dto.zoneId,
      customerName: dto.customerName.trim().slice(0, 100),
      customerPhone: dto.customerPhone.trim().replace(/[^\d+]/g, '').slice(0, 15),
      addressDetails: dto.addressDetails,
      items: verifiedItems,
      subtotal: verifiedSubtotal,
      deliveryFee,
      packagingFee,
      discount,
      total: verifiedTotal,
      orderStatus: 'PLACED',
      paymentMethod: dto.paymentMethod || 'RAZORPAY',
      paymentStatus: dto.paymentStatus || 'PAID',
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      riderName: 'Pilot assigning...',
      estimatedMins: dto.estimatedMins || 15,
      createdAt: new Date().toISOString(),
    };

    const saved = await this.repo.create(newOrder);

    // Broadcast real-time kitchen event across tabs & devices
    realtimeHub.broadcast({
      type: 'ORDER_PLACED',
      order: saved,
    });

    return saved;
  }

  async updateOrder(id: string, dto: UpdateOrderDto): Promise<Order | null> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new Error(`Order with ID ${id} not found`);
    }

    const updated = await this.repo.update(id, dto);
    if (updated && dto.orderStatus) {
      realtimeHub.broadcast({
        type: 'ORDER_STATUS_UPDATED',
        orderId: id,
        status: dto.orderStatus,
        riderName: dto.riderName,
        estimatedMins: dto.estimatedMins,
      });
    }

    return updated;
  }

  async getRevenueMetrics(filter?: OrderFilter) {
    const orders = await this.repo.findAll(filter);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const razorpayOrders = orders.filter(
      (o) =>
        o.paymentMethod === 'RAZORPAY' ||
        o.paymentMethod === 'UPI_QR' ||
        o.paymentMethod === 'UPI_INTENT'
    );
    const razorpayRevenue = razorpayOrders.reduce((sum, o) => sum + o.total, 0);
    const codOrders = orders.filter((o) => o.paymentMethod === 'CASH_ON_DELIVERY');
    const codRevenue = codOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrdersCount = orders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    return {
      totalRevenue,
      razorpayRevenue,
      codRevenue,
      totalOrdersCount,
      avgOrderValue,
      orders,
    };
  }
}

export const ordersService = new OrdersService();
