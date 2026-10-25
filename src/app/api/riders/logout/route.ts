import { NextRequest, NextResponse } from 'next/server';
import { RIDER_COOKIE_NAME } from '@/lib/authTokens';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Pilot shift session cleared',
  });

  response.cookies.set({
    name: RIDER_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
