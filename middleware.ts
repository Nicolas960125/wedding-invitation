import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isAuthorizedAdmin } from '@/lib/auth/isAdmin';

// NOTA: el rate limiting del path /invite/* se aplica en el server action submitRsvp
// y no aca, porque @upstash/redis usa APIs de Node no compatibles con Edge Runtime.
// Si se quiere ratelimit a nivel de visita, mover middleware a runtime nodejs
// (export const config = { ..., runtime: 'nodejs' }) en una version futura de Next.

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/auth/confirm'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh de sesion (siempre)
  const { supabaseResponse, user } = await updateSession(request);

  // Proteccion de /admin/*
  if (pathname.startsWith('/admin') && !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    const allowed = await isAuthorizedAdmin(user.email);
    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
