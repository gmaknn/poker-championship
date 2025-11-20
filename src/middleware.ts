import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Routes publiques (optimisé pour réduire la taille du bundle)
const PUBLIC_ROUTES = ['/login', '/activate', '/forgot-password', '/reset-password'];
const PUBLIC_API_ROUTES = ['/api/auth'];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Vérifier routes publiques (optimisé)
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
      PUBLIC_API_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Protéger dashboard et API
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/api')) && !req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Matcher optimisé pour réduire l'exécution du middleware
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/login',
    '/activate',
    '/forgot-password',
    '/reset-password',
  ],
};
