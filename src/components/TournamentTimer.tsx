'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import { Play, Pause, RotateCcw, Clock, ArrowUp } from 'lucide-react';
import { playCountdown, announceLevelChange } from '@/lib/audioManager';

type BlindLevel = {
  id: string;
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
};

type TimerState = {
  tournamentId: string;
  status: string;
  isRunning: boolean;
  isPaused: boolean;
  currentLevel: number;
  currentLevelData: BlindLevel | null;
  totalElapsedSeconds: number;
  secondsIntoCurrentLevel: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
};

type Props = {
  tournamentId: string;
  tournamentStatus?: string;
  onUpdate?: () => void;
};

export default function TournamentTimer({ tournamentId, tournamentStatus, onUpdate }: Props) {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [localTime, setLocalTime] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  // Refs to track if sounds were already played for this level
  const countdownPlayedRef = useRef(false);
  const levelAnnouncedRef = useRef(false);
  const previousLevelRef = useRef<number | null>(null);

  const fetchTimerState = useCallback(async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer`);
      if (response.ok) {
        const data = await response.json();
        setTimerState(data);
        setLocalTime(data.secondsIntoCurrentLevel);
        setError('');
      }
    } catch (error) {
      console.error('Error fetching timer state:', error);
      setError('Erreur lors du chargement du timer');
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTimerState();
    // Rafraîchir l'état toutes les 5 secondes
    const interval = setInterval(fetchTimerState, 5000);
    return () => clearInterval(interval);
  }, [fetchTimerState]);

  // Timer local pour l'affichage fluide
  useEffect(() => {
    if (!timerState?.isRunning) return;

    const interval = setInterval(() => {
      setLocalTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timerState?.isRunning]);

  // Reset sound flags when level changes
  useEffect(() => {
    const currentLevel = timerState?.currentLevel;
    if (currentLevel && currentLevel !== previousLevelRef.current) {
      previousLevelRef.current = currentLevel;
      countdownPlayedRef.current = false;
      levelAnnouncedRef.current = false;
      setIsFlashing(false);
    }
  }, [timerState?.currentLevel]);

  // Countdown sound and animation (5 seconds before end)
  useEffect(() => {
    if (!timerState?.isRunning) return;

    const timeRemaining = getTimeRemaining();

    // Play countdown at 5 seconds
    if (timeRemaining === 5 && !countdownPlayedRef.current) {
      countdownPlayedRef.current = true;
      playCountdown();
      setIsFlashing(true);

      // Stop flashing after countdown
      setTimeout(() => {
        setIsFlashing(false);
      }, 2000);
    }

    // Announce level change when timer ends
    if (timeRemaining === 0 && !levelAnnouncedRef.current && timerState.currentLevelData) {
      levelAnnouncedRef.current = true;

      // Wait a bit for the server to update to the next level
      setTimeout(() => {
        fetchTimerState().then(() => {
          // Announce the new level (will use updated state)
          const nextLevel = timerState.currentLevel + 1;
          const nextLevelData = timerState.currentLevelData;
          if (nextLevelData) {
            announceLevelChange(
              nextLevel,
              nextLevelData.smallBlind,
              nextLevelData.bigBlind,
              nextLevelData.ante
            );
          }
        });
      }, 1000);
    }
  }, [timerState, localTime, fetchTimerState]);

  // Raccourci clavier : Barre d'espace pour pause/resume
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Barre d'espace
      if (e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();

        if (timerState?.isRunning) {
          handlePause();
        } else if (timerState?.isPaused) {
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState?.isRunning, timerState?.isPaused]);

  const handleStart = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/start`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchTimerState();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors du démarrage');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      setError('Erreur lors du démarrage');
    }
  };

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/pause`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchTimerState();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la mise en pause');
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
      setError('Erreur lors de la mise en pause');
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/resume`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchTimerState();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la reprise');
      }
    } catch (error) {
      console.error('Error resuming timer:', error);
      setError('Erreur lors de la reprise');
    }
  };

  const handleReset = async () => {
    if (!confirm('Voulez-vous vraiment réinitialiser le timer ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchTimerState();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Error resetting timer:', error);
      setError('Erreur lors de la réinitialisation');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = () => {
    if (!timerState?.currentLevelData) return 0;
    const levelDurationSeconds = timerState.currentLevelData.duration * 60;
    return Math.max(0, levelDurationSeconds - localTime);
  };

  const getProgressPercentage = () => {
    if (!timerState?.currentLevelData) return 0;
    const levelDurationSeconds = timerState.currentLevelData.duration * 60;
    return Math.min(100, (localTime / levelDurationSeconds) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!timerState) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Erreur lors du chargement du timer
        </CardContent>
      </Card>
    );
  }

  if (!timerState.currentLevelData) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            Veuillez configurer la structure des blinds avant de démarrer le timer
          </p>
        </CardContent>
      </Card>
    );
  }

  const timeRemaining = getTimeRemaining();
  const progress = getProgressPercentage();
  const isLowTime = timeRemaining < 60 && timeRemaining > 0;
  const isFinished = tournamentStatus === 'FINISHED';

  // Si le tournoi est terminé, afficher un message simple
  if (isFinished) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-6xl font-bold text-green-600 mb-4">
            Terminé
          </div>
          <p className="text-muted-foreground">
            Le tournoi est terminé. Les modifications ne sont plus possibles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Niveau actuel - ink variant pour KPIs */}
      <SectionCard
        variant="ink"
        title="Niveau actuel"
        actions={
          <Badge variant="outline">
            Niveau {timerState.currentLevelData.level}
          </Badge>
        }
      >
        <div className="grid gap-6 md:grid-cols-3">
          {/* Small Blind */}
          <div className="text-center">
            <div className="text-sm text-ink-foreground/70 mb-1">Small Blind</div>
            <div className="text-3xl font-bold">
              {timerState.currentLevelData.smallBlind.toLocaleString()}
            </div>
          </div>

          {/* Big Blind */}
          <div className="text-center">
            <div className="text-sm text-ink-foreground/70 mb-1">Big Blind</div>
            <div className="text-3xl font-bold">
              {timerState.currentLevelData.bigBlind.toLocaleString()}
            </div>
          </div>

          {/* Ante */}
          <div className="text-center">
            <div className="text-sm text-ink-foreground/70 mb-1">Ante</div>
            <div className="text-3xl font-bold">
              {timerState.currentLevelData.ante > 0
                ? timerState.currentLevelData.ante.toLocaleString()
                : '-'}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Timer */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Temps restant */}
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2 flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                Temps restant dans le niveau
              </div>
              <div
                className={`text-6xl font-mono font-bold transition-all ${
                  isFlashing ? 'animate-pulse text-orange-500 scale-110' :
                  isLowTime ? 'text-destructive' : ''
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
            </div>

            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="h-4 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {Math.floor(progress)}% du niveau complété
              </div>
            </div>

            {/* Boutons de contrôle */}
            <div className="flex items-center justify-center gap-4 pt-4">
              {!timerState.isRunning && !timerState.isPaused && (
                <Button onClick={handleStart} size="lg">
                  <Play className="mr-2 h-5 w-5" />
                  Démarrer
                </Button>
              )}

              {timerState.isRunning && (
                <Button onClick={handlePause} size="lg" variant="outline">
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              )}

              {timerState.isPaused && (
                <Button onClick={handleResume} size="lg">
                  <Play className="mr-2 h-5 w-5" />
                  Reprendre
                </Button>
              )}

              <Button
                onClick={handleReset}
                size="lg"
                variant="destructive"
                disabled={!timerState.timerStartedAt}
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Réinitialiser
              </Button>
            </div>

            {/* Statut */}
            <div className="text-center space-y-2">
              <div>
                {timerState.isRunning && (
                  <Badge variant="default">En cours</Badge>
                )}
                {timerState.isPaused && (
                  <Badge variant="secondary">En pause</Badge>
                )}
                {!timerState.isRunning && !timerState.isPaused && (
                  <Badge variant="outline">Non démarré</Badge>
                )}
              </div>
              {(timerState.isRunning || timerState.isPaused) && (
                <div className="text-xs text-muted-foreground">
                  Appuyez sur <kbd className="px-2 py-1 text-xs font-semibold bg-secondary rounded">Espace</kbd> pour pause/reprendre
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prochain niveau */}
      {timeRemaining < 120 && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Prochain niveau</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground">
              Niveau {timerState.currentLevelData.level + 1} à venir...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
