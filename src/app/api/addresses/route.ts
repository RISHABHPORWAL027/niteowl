import { NextRequest, NextResponse } from 'next/server';
import { addressesService } from '@/services/addresses/addresses.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || undefined;
    const tag = searchParams.get('tag') || undefined;

    const addresses = await addressesService.listAddresses({ userId, tag });
    return NextResponse.json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || (!body.street && !body.building && !body.landmark)) {
      return NextResponse.json(
        { success: false, error: 'Address details (street/building/landmark) are required' },
        { status: 400 }
      );
    }

    const newAddress = await addressesService.createAddress(body, body.userId);
    return NextResponse.json(
      { success: true, address: newAddress },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create address' },
      { status: 500 }
    );
  }
}
