import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware ultra-léger pour Vercel Edge (< 1MB)
// Vérifie uniquement la présence du cookie de session NextAuth
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Routes publiques (pas de vérification auth)
  if (pathname.startsWith('/login') ||
      pathname.startsWith('/activate') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/tts') ||
      pathname.startsWith('/tv') ||
      pathname.startsWith('/player') ||
      pathname.startsWith('/director') ||
      pathname === '/') {
    return NextResponse.next();
  }

  // Protéger dashboard et API (vérification légère du cookie)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api')) {
    // Vérifier présence du cookie de session NextAuth
    const sessionToken = req.cookies.get('next-auth.session-token') ||
                        req.cookies.get('__Secure-next-auth.session-token');

    if (!sessionToken) {
      // Rediriger vers login si pas de session
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/login',
    '/activate',
    '/forgot-password',
    '/reset-password',
  ],
};
