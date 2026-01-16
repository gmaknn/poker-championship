import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { areRecavesOpen } from '@/lib/tournament-utils';

// Force dynamic rendering - no caching for live timer state
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Récupérer l'état actuel du timer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        currentLevel: true,
        rebuyEndLevel: true,
        timerStartedAt: true,
        timerPausedAt: true,
        timerElapsedSeconds: true,
        levelDuration: true,
        blindLevels: {
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Calculer le temps écoulé actuel
    let currentElapsedSeconds = tournament.timerElapsedSeconds;

    if (tournament.timerStartedAt && !tournament.timerPausedAt) {
      // Timer en cours, calculer le temps depuis le démarrage
      const now = new Date();
      const startTime = new Date(tournament.timerStartedAt);
      const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      currentElapsedSeconds += additionalSeconds;
    }

    // Déterminer le niveau actuel basé sur le temps écoulé
    let calculatedLevel = 1;
    let timeIntoCurrentLevel = currentElapsedSeconds;

    for (const level of tournament.blindLevels) {
      const levelDuration = level.duration * 60; // Convertir en secondes
      if (timeIntoCurrentLevel >= levelDuration) {
        timeIntoCurrentLevel -= levelDuration;
        calculatedLevel = level.level + 1;
      } else {
        calculatedLevel = level.level;
        break;
      }
    }

    // Limiter le niveau au dernier niveau disponible
    const maxLevel = tournament.blindLevels[tournament.blindLevels.length - 1]?.level || 1;
    if (calculatedLevel > maxLevel) {
      calculatedLevel = maxLevel;
      // Si on dépasse, le temps dans le niveau est le temps total de ce dernier niveau
      const lastLevel = tournament.blindLevels[tournament.blindLevels.length - 1];
      timeIntoCurrentLevel = lastLevel ? lastLevel.duration * 60 : 0;
    }

    // Trouver le niveau actuel dans la liste
    const currentLevelData = tournament.blindLevels.find(
      (bl) => bl.level === calculatedLevel
    );

    const isRunning = !!tournament.timerStartedAt && !tournament.timerPausedAt;
    const isPaused = !!tournament.timerPausedAt;

    // Déterminer si les recaves sont ouvertes (inclut la pause après "Fin recaves")
    const recavesOpen = areRecavesOpen(tournament, calculatedLevel, tournament.blindLevels);

    const response = NextResponse.json({
      tournamentId: tournament.id,
      status: tournament.status,
      isRunning,
      isPaused,
      currentLevel: calculatedLevel,
      currentLevelData,
      totalElapsedSeconds: currentElapsedSeconds,
      secondsIntoCurrentLevel: timeIntoCurrentLevel,
      timerStartedAt: tournament.timerStartedAt,
      timerPausedAt: tournament.timerPausedAt,
      recavesOpen,
      rebuyEndLevel: tournament.rebuyEndLevel,
    });

    // Disable all caching for live timer state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Error fetching timer state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timer state' },
      { status: 500 }
    );
  }
}
