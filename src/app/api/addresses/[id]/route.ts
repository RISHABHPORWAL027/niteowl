import { NextRequest, NextResponse } from 'next/server';
import { addressesService } from '@/services/addresses/addresses.service';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const address = await addressesService.getAddressById(id);
    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, address });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch address' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updates = await req.json();
    const updated = await addressesService.updateAddress(id, updates);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Address not found or failed to update' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, address: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update address' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const deleted = await addressesService.deleteAddress(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Address not found or already deleted' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete address' },
      { status: 500 }
    );
  }
}
