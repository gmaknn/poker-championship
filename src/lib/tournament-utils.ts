import { Tournament } from '@prisma/client';

/**
 * Détermine si les recaves sont encore ouvertes pour un tournoi.
 *
 * Les recaves sont ouvertes si:
 * - Le tournoi est en cours (IN_PROGRESS)
 * - Le niveau courant est <= rebuyEndLevel (si rebuyEndLevel est défini)
 *
 * @param tournament - Le tournoi à vérifier
 * @returns true si les recaves sont ouvertes, false sinon
 */
export function areRecavesOpen(
  tournament: Pick<Tournament, 'status' | 'currentLevel' | 'rebuyEndLevel'>
): boolean {
  // Les recaves ne sont possibles que si le tournoi est en cours
  if (tournament.status !== 'IN_PROGRESS') {
    return false;
  }

  // Si aucune limite de niveau de recave n'est définie, les recaves sont toujours ouvertes
  if (tournament.rebuyEndLevel === null || tournament.rebuyEndLevel === undefined) {
    return true;
  }

  // Les recaves sont ouvertes si le niveau courant est <= au niveau de fin de recave
  return tournament.currentLevel <= tournament.rebuyEndLevel;
}
