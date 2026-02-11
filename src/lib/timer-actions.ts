import { prisma } from '@/lib/prisma';
import { emitToTournament } from '@/lib/socket';

/**
 * Pause the tournament timer programmatically.
 * Returns { paused: true } if the timer was paused, { paused: false } if already paused or not started.
 *
 * Used by:
 * - Timer pause API route (manual pause)
 * - Bust route (auto-pause on bust)
 * - Elimination route (auto-pause on elimination)
 */
export async function pauseTimerForTournament(tournamentId: string): Promise<{
  paused: boolean;
  elapsedSeconds?: number;
}> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      timerStartedAt: true,
      timerPausedAt: true,
      timerElapsedSeconds: true,
    },
  });

  if (!tournament) {
    return { paused: false };
  }

  // Only pause if timer is actually running (started and not already paused)
  if (!tournament.timerStartedAt || tournament.timerPausedAt) {
    return { paused: false };
  }

  const now = new Date();
  const startTime = new Date(tournament.timerStartedAt);
  const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
  const totalElapsed = tournament.timerElapsedSeconds + additionalSeconds;

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      timerPausedAt: now,
      timerElapsedSeconds: totalElapsed,
    },
  });

  emitToTournament(tournamentId, 'timer:paused', {
    tournamentId,
    pausedAt: now,
    elapsedSeconds: totalElapsed,
  });

  return { paused: true, elapsedSeconds: totalElapsed };
}

/**
 * Resume the tournament timer programmatically.
 * Returns { resumed: true } if the timer was resumed, { resumed: false } if not paused.
 */
export async function resumeTimerForTournament(tournamentId: string): Promise<{
  resumed: boolean;
}> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      timerPausedAt: true,
    },
  });

  if (!tournament || !tournament.timerPausedAt) {
    return { resumed: false };
  }

  const now = new Date();
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      timerStartedAt: now,
      timerPausedAt: null,
    },
  });

  emitToTournament(tournamentId, 'timer:resumed', {
    tournamentId,
    resumedAt: now,
  });

  return { resumed: true };
}

/**
 * Schedule an auto-resume of the timer after a delay.
 * Emits 'tournament:timer-auto-resume' immediately so clients can show a countdown,
 * then actually resumes the timer after delaySeconds.
 * If the timer is manually resumed before the delay, the scheduled resume is a no-op.
 */
export function scheduleAutoResume(tournamentId: string, delaySeconds: number): void {
  // Notify clients immediately so they can display the countdown
  emitToTournament(tournamentId, 'tournament:timer-auto-resume', {
    tournamentId,
    delaySeconds,
  });

  // After the delay, actually resume the timer (no-op if already resumed manually)
  setTimeout(async () => {
    try {
      await resumeTimerForTournament(tournamentId);
    } catch (error) {
      console.error('Error in scheduled auto-resume:', error);
    }
  }, delaySeconds * 1000);
}
