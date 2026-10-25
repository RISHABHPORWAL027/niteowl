import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/authTokens';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect Admin Dashboard Routes (/admin, /admin/...)
  if (pathname.startsWith('/admin')) {
    // Whitelist the login page itself and static assets
    if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
      return NextResponse.next();
    }

    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const admin = await verifyAdminToken(token);

    if (!admin) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect Admin API Routes (/api/admin/* except login)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/login')) {
    const token =
      req.cookies.get(ADMIN_COOKIE_NAME)?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');

    const admin = await verifyAdminToken(token);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication token required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
