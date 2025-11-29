import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_EMAILS = [
  'admin@tracebackmy.com',
  // Add your admin emails here
];

export function middleware(request: NextRequest) {
  // Check if the path is an admin route
  if (request.nextUrl.pathname.startsWith('/traceback-admin')) {
    const authToken = request.cookies.get('__session')?.value;
    
    // For now, we'll handle auth in the client components
    // This middleware ensures admin routes are not cached publicly
    const response = NextResponse.next();
    
    // Add security headers for admin routes
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