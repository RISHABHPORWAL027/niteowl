import { NextRequest, NextResponse } from 'next/server';
import { menuService } from '@/services/menu/menu.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const isVegParam = searchParams.get('isVeg');
    const isVeg = isVegParam !== null ? isVegParam === 'true' : undefined;
    const search = searchParams.get('search') || undefined;

    const items = await menuService.listMenuItems({ category, isVeg, search });
    return NextResponse.json({ success: true, count: items.length, items });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}
