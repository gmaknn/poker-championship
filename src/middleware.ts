import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/jwt-secret';

// Middleware de protection des routes
//
// Routes PUBLIQUES (pas d'auth requise) :
// - /player/login, /player/leaderboard, /player/tournaments, /player/live, /player/players, /player/[id]
// - /tv (mode TV spectateur)
// - /login, /activate, /dev-login
// - APIs publiques listées ci-dessous
//
// Routes PROTÉGÉES par authentification ET rôle :
// - /dashboard/* : ADMIN, TOURNAMENT_DIRECTOR uniquement
// - /director : TOURNAMENT_DIRECTOR, ADMIN uniquement
// - /player/profile, /player/stats, /player/seasons : Player authentifié

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
  for (const route of PUBLIC_API_ROUTES) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return true;
    }
  }

  for (const pattern of PUBLIC_API_PATTERNS) {
    if (pattern.test(pathname)) {
      return true;
    }
  }

  return false;
}

// Rôles autorisés pour /dashboard/*
const DASHBOARD_ALLOWED_ROLES = ['ADMIN', 'TOURNAMENT_DIRECTOR'];

// Rôles autorisés pour les pages d'export (ANIMATOR peut accéder en lecture)
const DASHBOARD_EXPORT_ALLOWED_ROLES = ['ADMIN', 'TOURNAMENT_DIRECTOR', 'ANIMATOR'];

// Helper to verify player JWT token
async function verifyPlayerToken(token: string): Promise<{
  playerId: string;
  role: string;
  type: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      playerId: payload.playerId as string,
      role: payload.role as string,
      type: payload.type as string,
    };
  } catch {
    return null;
  }
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Routes API
  if (pathname.startsWith('/api/')) {
    if (isPublicApiRoute(pathname)) {
      return NextResponse.next();
    }
    // Les autres APIs gèrent leur propre auth (401/403)
    return NextResponse.next();
  }

  // Routes dashboard et director - protection obligatoire avec vérification de rôle
  if (pathname.startsWith('/dashboard') || pathname === '/director') {

    // 1. Vérifier si un joueur est connecté via player-session (cookie JWT)
    const playerSessionCookie = req.cookies.get('player-session')?.value;

    if (playerSessionCookie) {
      const playerSession = await verifyPlayerToken(playerSessionCookie);

      if (playerSession) {
        // Un joueur est connecté via le système Player
        // Vérifier si son rôle permet l'accès au dashboard

        // Pages d'export spéciales : ANIMATOR peut y accéder
        const isExportPage = pathname.includes('/exports') || pathname.includes('/leaderboard');
        const allowedRoles = isExportPage ? DASHBOARD_EXPORT_ALLOWED_ROLES : DASHBOARD_ALLOWED_ROLES;

        if (!allowedRoles.includes(playerSession.role)) {
          // Rôle insuffisant - rediriger vers l'espace joueur
          console.log(`[MIDDLEWARE] Access denied to ${pathname} for player role ${playerSession.role}`);
          return NextResponse.redirect(new URL('/player', req.url));
        }

        // Rôle autorisé - laisser passer
        console.log(`[MIDDLEWARE] Access granted to ${pathname} for player role ${playerSession.role}`);
        return NextResponse.next();
      }
    }

    // 2. Vérifier l'auth NextAuth (User/Admin)
    if (req.auth) {
      // User connecté via NextAuth
      const userRole = req.auth.user?.role as string;

      // Pages d'export spéciales
      const isExportPage = pathname.includes('/exports') || pathname.includes('/leaderboard');
      const allowedRoles = isExportPage ? DASHBOARD_EXPORT_ALLOWED_ROLES : DASHBOARD_ALLOWED_ROLES;

      if (!allowedRoles.includes(userRole)) {
        // Rôle insuffisant
        console.log(`[MIDDLEWARE] Access denied to ${pathname} for user role ${userRole}`);
        return NextResponse.redirect(new URL('/player', req.url));
      }

      // Rôle autorisé
      return NextResponse.next();
    }

    // 3. Pas d'authentification du tout - rediriger vers login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
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
