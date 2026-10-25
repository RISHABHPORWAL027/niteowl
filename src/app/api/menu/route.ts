import { NextRequest, NextResponse } from 'next/server';
import { menuService } from '@/services/menu/menu.service';
import { verifyRequestAuth } from '@/lib/authTokens';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const isVegParam = searchParams.get('isVeg');
    const isVeg = isVegParam !== null ? isVegParam === 'true' : undefined;
    const search = searchParams.get('search') || undefined;
    const outletId = searchParams.get('outletId') || undefined;

    const items = await menuService.listMenuItems({ category, isVeg, search, outletId });
    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required to create menu items' },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body || !body.name || !body.basePrice) {
      return NextResponse.json(
        { success: false, error: 'Product name and price are required' },
        { status: 400 }
      );
    }

    const item = await menuService.createMenuItem(body);
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
