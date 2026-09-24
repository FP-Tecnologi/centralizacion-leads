import { NextResponse, type NextRequest } from 'next/server';

/*
 * Route guard for the dashboard. Real auth (the JWT) lives in localStorage,
 * which the Edge middleware runtime can't read — so api.ts's tokenStore
 * also sets a non-httpOnly `ax_session` marker cookie (never the real
 * token) purely so this can tell "logged in at some point recently" apart
 * from "never logged in", and redirect accordingly. Every actual API call
 * is still authorized by the real Bearer token, not this cookie.
 */
const SESSION_COOKIE = 'ax_session';
const PUBLIC_PREFIXES = ['/auth', '/pages', '/error'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublicPath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/sign-in';
    return NextResponse.redirect(signInUrl);
  }

  if (hasSession && pathname.startsWith('/auth')) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = '/';
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
