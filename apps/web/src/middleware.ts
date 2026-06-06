import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// auth() used as middleware wrapper — req is NextAuthRequest (extends NextRequest + .auth)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (auth as any)((req: any) => {
  const isLoggedIn = !!req.auth;
  const isAuthRoute = (req.nextUrl.pathname as string).startsWith('/login');

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/patients', req.url));
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
