import { NextRequest, NextResponse } from 'next/server';
import { ordersService } from '@/services/orders/orders.service';
import { OrderFilter } from '@/services/orders/orders.types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const filter: OrderFilter = {
      outletId: searchParams.get('outletId') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      zoneId: searchParams.get('zoneId') || undefined,
      riderId: searchParams.get('riderId') || undefined,
      timeRange: (searchParams.get('timeRange') as any) || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    };

    const orders = await ordersService.listOrders(filter);
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = await ordersService.placeOrder(body);
    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to place order' },
      { status: 400 }
    );
  }
}
