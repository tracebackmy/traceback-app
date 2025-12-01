import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add security headers for admin routes to prevent clickjacking
  if (request.nextUrl.pathname.startsWith('/traceback-admin')) {
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/traceback-admin/:path*',
  ],
};