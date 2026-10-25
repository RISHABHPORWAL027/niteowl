import { NextRequest, NextResponse } from 'next/server';
import { fleetService } from '@/services/fleet/fleet.service';
import { verifyRequestAuth } from '@/lib/authTokens';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const rider = await fleetService.getRiderById(id);

    if (!rider) {
      return NextResponse.json(
        { success: false, error: `Rider ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, rider });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch rider' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await verifyRequestAuth(req);

    // Only Admin or the rider themself can update their status
    if (auth.isRider && !auth.isAdmin && auth.pilotId !== id) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You cannot alter another pilot status' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    const updated = await fleetService.updateRiderStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Rider with ID ${id} not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, rider: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update rider status' },
      { status: 400 }
    );
  }
}
