import { NextRequest, NextResponse } from 'next/server';
import { menuService } from '@/services/menu/menu.service';
import { verifyRequestAuth } from '@/lib/authTokens';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const item = await menuService.getMenuItemById(id);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch menu item' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required to edit menu items' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const updates = await req.json();
    const updated = await menuService.updateMenuItem(id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found or failed to update' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required to delete menu items' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const deleted = await menuService.deleteMenuItem(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Menu item not found or already deleted' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
