import { NextRequest, NextResponse } from 'next/server';
import { ordersService } from '@/services/orders/orders.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
    const updated = await ordersService.updateOrder(id, body);

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update order' },
      { status: 400 }
    );
  }
}
