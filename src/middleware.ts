import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Middleware de protection des routes
//
// Routes PUBLIQUES (pas d'auth requise) :
// - /player (hub, leaderboard, profils, live)
// - /tv (mode TV spectateur)
// - /login, /activate, /dev-login
// - /api/seasons/[id]/leaderboard (classement public)
// - /api/seasons (liste des saisons)
// - /api/players (liste des joueurs publics)
// - /api/tournaments/[id]/live-leaderboard (classement live public)
// - /api/health
//
// Routes PROTÉGÉES (auth requise) :
// - /dashboard (administration)
// - /director (dashboard TD)

// APIs publiques qui ne nécessitent pas d'authentification
const PUBLIC_API_ROUTES = [
  '/api/seasons',
  '/api/players',
  '/api/health',
  '/api/auth',
  '/api/tournaments', // GET pour liste publique
];

// Patterns d'APIs publiques (regex)
const PUBLIC_API_PATTERNS = [
  /^\/api\/seasons\/[^/]+\/leaderboard$/,
  /^\/api\/seasons\/[^/]+\/leaderboard-public$/,
  /^\/api\/tournaments\/[^/]+\/live-leaderboard$/,
  /^\/api\/tournaments\/[^/]+\/results$/,
  /^\/api\/players\/[^/]+\/dashboard$/,
  /^\/api\/players\/[^/]+$/,
];

function isPublicApiRoute(pathname: string): boolean {
  // Vérifier les routes exactes ou préfixes
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      // Exception: /api/auth/invite et /api/auth/activate sont publics
      // mais les autres /api/auth/* aussi (NextAuth les gère)
      return true;
    }
  }

  // Vérifier les patterns
  for (const pattern of PUBLIC_API_PATTERNS) {
    if (pattern.test(pathname)) {
      return true;
    }
  }

  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Routes API
  if (pathname.startsWith('/api/')) {
    // Les APIs publiques passent sans vérification
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }

    // Les autres APIs nécessitent une authentification
    // Mais on ne redirige pas, on laisse l'API gérer (401/403)
    return NextResponse.next();
  }

  // Routes dashboard - protection obligatoire
  if (pathname.startsWith('/dashboard') || pathname === '/director') {
    if (!req.auth) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Toutes les autres routes sont publiques
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json).*)',
  ],
};
