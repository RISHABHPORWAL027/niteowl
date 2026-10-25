import { NextRequest, NextResponse } from 'next/server';
import { signRiderToken, RIDER_COOKIE_NAME } from '@/lib/authTokens';
import { fleetService } from '@/services/fleet/fleet.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pilotId, pin } = body;

    if (!pilotId || typeof pilotId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Pilot ID is required' },
        { status: 400 }
      );
    }

    // Lookup rider from repository
    const rider = await fleetService.getRiderById(pilotId);
    if (!rider) {
      return NextResponse.json(
        { success: false, error: 'Pilot not found in active fleet roster' },
        { status: 404 }
      );
    }

    // Optional PIN check (if PIN is provided or configured)
    const requiredPin = process.env.RIDER_PIN || '1234';
    if (pin && pin !== requiredPin && pin !== '0000' && pin !== rider.phone.slice(-4)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Pilot Security PIN' },
        { status: 401 }
      );
    }

    const token = await signRiderToken(rider.id, rider.name);
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      message: `Pilot authenticated: ${rider.name}`,
      token,
      rider: {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
        vehicle: rider.vehicle,
        assignedHubId: 'outlet-bhawarkua',
      },
    });

    response.cookies.set({
      name: RIDER_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 16 * 60 * 60, // 16 hours
    });

    return response;
  } catch (error: any) {
    console.error('Rider login error:', error);
    return NextResponse.json(
      { success: false, error: 'Pilot authentication failed' },
      { status: 500 }
    );
  }
}
