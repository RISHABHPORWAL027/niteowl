import { NextRequest, NextResponse } from 'next/server';
import { ordersService } from '@/services/orders/orders.service';
import { OrderFilter } from '@/services/orders/orders.types';
import { verifyRequestAuth } from '@/lib/authTokens';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await verifyRequestAuth(req);

    const filter: OrderFilter = {
      outletId: searchParams.get('outletId') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      zoneId: searchParams.get('zoneId') || undefined,
      riderId: searchParams.get('riderId') || undefined,
      timeRange: (searchParams.get('timeRange') as any) || undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    };

    // Pilot Isolation Enforcement:
    // If the caller is an authenticated delivery pilot (and not an admin),
    // strictly constrain query results to their assigned pilot ID only.
    if (auth.isRider && !auth.isAdmin && auth.pilotId) {
      filter.riderId = auth.pilotId;
    }

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
