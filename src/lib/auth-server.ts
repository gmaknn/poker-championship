import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Vérifie si l'utilisateur connecté est un administrateur
 * Retourne la session si l'utilisateur est admin, sinon retourne une erreur 403
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  const isAdmin = session.user.userType === 'admin' || session.user.role === 'ADMIN';

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Accès refusé. Droits administrateur requis.' },
      { status: 403 }
    );
  }

  return { session };
}

/**
 * Vérifie si l'utilisateur connecté est un administrateur ou un directeur de tournoi
 * Retourne la session si l'utilisateur a les droits, sinon retourne une erreur 403
 */
export async function requireAdminOrTD() {
  const session = await auth();

  if (!session || !session.user) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  const isAdmin = session.user.userType === 'admin' || session.user.role === 'ADMIN';
  const isTournamentDirector = session.user.role === 'TOURNAMENT_DIRECTOR';

  if (!isAdmin && !isTournamentDirector) {
    return NextResponse.json(
      { error: 'Accès refusé. Droits administrateur ou directeur de tournoi requis.' },
      { status: 403 }
    );
  }

  return { session };
}

/**
 * Récupère la session de l'utilisateur connecté
 * Retourne null si non connecté
 */
export async function getSession() {
  return await auth();
}
