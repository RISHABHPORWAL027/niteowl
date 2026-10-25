import { NextRequest, NextResponse } from 'next/server';
import { fleetService } from '@/services/fleet/fleet.service';
import { verifyRequestAuth } from '@/lib/authTokens';

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Hub Manager access required to dispatch fleet.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { orderIds, riderId, autoDispatch } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'orderIds array is required' },
        { status: 400 }
      );
    }
    if (!riderId) {
      return NextResponse.json(
        { success: false, error: 'riderId is required' },
        { status: 400 }
      );
    }

    const result = await fleetService.bulkAssignRider({
      orderIds,
      riderId,
      autoDispatch: Boolean(autoDispatch),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to assign rider' },
      { status: 400 }
    );
  }
}
