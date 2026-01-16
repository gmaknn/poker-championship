import { Tournament, BlindLevel } from '@prisma/client';

/**
 * Calcule le niveau effectif du tournoi basé sur le temps écoulé.
 * Cette fonction doit être utilisée à la place de tournament.currentLevel
 * car ce dernier n'est pas mis à jour en temps réel.
 *
 * @param tournament - Le tournoi avec les données du timer
 * @param blindLevels - Les niveaux de blindes ordonnés par level
 * @returns Le niveau actuel calculé
 */
export function calculateEffectiveLevel(
  tournament: Pick<Tournament, 'timerStartedAt' | 'timerPausedAt' | 'timerElapsedSeconds'>,
  blindLevels: Pick<BlindLevel, 'level' | 'duration'>[]
): number {
  // Calculer le temps écoulé actuel
  let currentElapsedSeconds = tournament.timerElapsedSeconds;

  if (tournament.timerStartedAt && !tournament.timerPausedAt) {
    const now = new Date();
    const startTime = new Date(tournament.timerStartedAt);
    const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    currentElapsedSeconds += additionalSeconds;
  }

  // Déterminer le niveau basé sur le temps écoulé
  let calculatedLevel = 1;
  let timeIntoCurrentLevel = currentElapsedSeconds;

  for (const level of blindLevels) {
    const levelDuration = level.duration * 60;
    if (timeIntoCurrentLevel >= levelDuration) {
      timeIntoCurrentLevel -= levelDuration;
      calculatedLevel = level.level + 1;
    } else {
      calculatedLevel = level.level;
      break;
    }
  }

  // Limiter au dernier niveau disponible
  const maxLevel = blindLevels[blindLevels.length - 1]?.level || 1;
  if (calculatedLevel > maxLevel) {
    calculatedLevel = maxLevel;
  }

  return calculatedLevel;
}

/**
 * Détermine si les recaves sont encore ouvertes pour un tournoi.
 *
 * Les recaves sont ouvertes si:
 * - Le tournoi est en cours (IN_PROGRESS)
 * - Le niveau courant est <= rebuyEndLevel (si rebuyEndLevel est défini)
 * - OU le niveau courant est la pause immédiatement après rebuyEndLevel
 *
 * @param tournament - Le tournoi à vérifier
 * @param effectiveLevel - Optionnel: niveau effectif calculé (sinon utilise currentLevel de la DB - ATTENTION: peut être désynchronisé)
 * @param blindLevels - Optionnel: liste des niveaux pour vérifier la pause après fin des recaves
 * @returns true si les recaves sont ouvertes, false sinon
 */
export function areRecavesOpen(
  tournament: Pick<Tournament, 'status' | 'currentLevel' | 'rebuyEndLevel'>,
  effectiveLevel?: number,
  blindLevels?: Pick<BlindLevel, 'level' | 'isBreak'>[]
): boolean {
  // Les recaves ne sont possibles que si le tournoi est en cours
  if (tournament.status !== 'IN_PROGRESS') {
    return false;
  }

  // Si aucune limite de niveau de recave n'est définie, les recaves sont toujours ouvertes
  if (tournament.rebuyEndLevel === null || tournament.rebuyEndLevel === undefined) {
    return true;
  }

  // Utiliser le niveau effectif s'il est fourni, sinon le niveau de la DB (potentiellement désynchronisé)
  const currentLevel = effectiveLevel ?? tournament.currentLevel;

  // Les recaves sont ouvertes si le niveau courant est <= au niveau de fin de recave
  if (currentLevel <= tournament.rebuyEndLevel) {
    return true;
  }

  // Vérifier si le niveau courant est la pause immédiatement après rebuyEndLevel
  if (blindLevels && currentLevel === tournament.rebuyEndLevel + 1) {
    const currentBlindLevel = blindLevels.find(bl => bl.level === currentLevel);
    if (currentBlindLevel?.isBreak) {
      return true;
    }
  }

  return false;
}
