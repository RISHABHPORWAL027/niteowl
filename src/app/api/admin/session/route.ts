import { NextRequest, NextResponse } from 'next/server';
import { verifyRequestAuth } from '@/lib/authTokens';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyRequestAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      admin: auth.adminPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}
