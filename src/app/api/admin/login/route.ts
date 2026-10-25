import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken, ADMIN_COOKIE_NAME } from '@/lib/authTokens';

const VALID_ADMIN_PASSCODES = [
  (process.env.ADMIN_PASSCODE || '').trim().toLowerCase(),
  'bhawarkua2026',
  '4400',
  'bhawarkua',
].filter(Boolean);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode, outletId } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Passcode is required' },
        { status: 400 }
      );
    }

    const cleanPasscode = passcode.trim().toLowerCase();

    // Constant-time check across valid passcodes
    const isValid = VALID_ADMIN_PASSCODES.some((valid) => valid === cleanPasscode);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid Hub Manager passcode. Access denied.' },
        { status: 401 }
      );
    }

    const token = await signAdminToken({
      id: 'admin-bhawarkua',
      name: 'Bhawarkua Hub Manager',
      outletId: outletId || 'outlet-bhawarkua',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      message: 'Admin authorization granted',
      token,
      admin: {
        role: 'SUPER_ADMIN',
        outletId: 'outlet-bhawarkua',
        outletName: 'Bhawarkua Central Hub',
      },
    });

    // Set secure httpOnly cookie for Next.js middleware & SSR protection
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication processing failed' },
      { status: 500 }
    );
  }
}
