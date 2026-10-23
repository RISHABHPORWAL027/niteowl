import { NextRequest, NextResponse } from 'next/server';
import { fleetService } from '@/services/fleet/fleet.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get('outletId') || undefined;
    const status = (searchParams.get('status') as any) || undefined;

    const riders = await fleetService.listRiders({ outletId, status });
    return NextResponse.json({ success: true, count: riders.length, riders });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch riders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newRider = await fleetService.registerRider(body);
    return NextResponse.json({ success: true, rider: newRider }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to register rider' },
      { status: 400 }
    );
  }
}
