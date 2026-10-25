import { NextRequest, NextResponse } from 'next/server';
import { ordersService } from '@/services/orders/orders.service';
import { verifyRequestAuth } from '@/lib/authTokens';
import { OrderStatus } from '@/types/database';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES: OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const order = await ordersService.getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    // Verify existing order exists
    const existing = await ordersService.getOrderById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Order with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Role-Based Access Control
    const auth = await verifyRequestAuth(req);

    if (auth.isRider && !auth.isAdmin) {
      // Rider can ONLY modify orders assigned to them
      const isAssigned =
        existing.riderId === auth.pilotId ||
        existing.riderName?.toLowerCase().includes(auth.pilotId?.toLowerCase() || '___');

      if (!isAssigned) {
        return NextResponse.json(
          {
            success: false,
            error: 'Access denied: You are only authorized to update your own assigned orders.',
          },
          { status: 403 }
        );
      }

      // Riders can only transition order status to OUT_FOR_DELIVERY or DELIVERED
      if (
        body.orderStatus &&
        body.orderStatus !== 'OUT_FOR_DELIVERY' &&
        body.orderStatus !== 'DELIVERED'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Riders are only permitted to mark orders OUT_FOR_DELIVERY or DELIVERED.',
          },
          { status: 403 }
        );
      }
    }

    // Sanitize and whitelist mutable fields (never allow altering prices, items, or IDs)
    const allowedUpdates: any = {};

    if (body.orderStatus && VALID_STATUSES.includes(body.orderStatus)) {
      allowedUpdates.orderStatus = body.orderStatus;
    }
    if (body.paymentStatus && ['PENDING', 'PAID', 'FAILED'].includes(body.paymentStatus)) {
      allowedUpdates.paymentStatus = body.paymentStatus;
    }
    if (body.riderId && typeof body.riderId === 'string') {
      allowedUpdates.riderId = body.riderId;
    }
    if (body.riderName && typeof body.riderName === 'string') {
      allowedUpdates.riderName = body.riderName;
    }
    if (body.riderPhone && typeof body.riderPhone === 'string') {
      allowedUpdates.riderPhone = body.riderPhone;
    }
    if (typeof body.estimatedMins === 'number') {
      allowedUpdates.estimatedMins = body.estimatedMins;
    }
    if (body.razorpayPaymentId && typeof body.razorpayPaymentId === 'string') {
      allowedUpdates.razorpayPaymentId = body.razorpayPaymentId;
    }

    const updated = await ordersService.updateOrder(id, allowedUpdates);

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    const isNotFound = error?.message?.includes('not found');
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update order' },
      { status: isNotFound ? 404 : 400 }
    );
  }
}
