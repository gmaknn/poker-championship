'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Trophy, Users, DollarSign, Clock, LayoutGrid } from 'lucide-react';
import { playCountdown, announceLevelChange, announceBreak, playAlertSound, announcePlayersRemaining, announceRebalanceTables, getTTSVolume, getTTSSpeed, setTTSVolume, setTTSSpeed, getBlindCommentaryEnabled, setBlindCommentaryEnabled } from '@/lib/audioManager';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { CircularTimer } from '@/components/CircularTimer';
import { Volume2, Gauge, Camera, Share2, Download, Palette, MessageSquare } from 'lucide-react';
import { capturePodiumPhoto, sharePodiumPhoto } from '@/lib/podiumPhotoGenerator';
import { TV_THEMES, getSavedTheme, saveTheme, applyThemeToElement, type TVTheme } from '@/lib/tvThemes';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
};

type TournamentPlayer = {
  id: string;
  playerId: string;
  finalRank: number | null;
  rebuysCount: number;
  eliminationsCount: number;
  leaderKills: number;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  prizeAmount: number | null;
  player: Player;
};

type BlindLevel = {
  id: string;
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
  isBreak: boolean;
  rebalanceTables: boolean;
};

type Tournament = {
  id: string;
  name: string | null;
  date: string;
  status: string;
  type: string;
  buyInAmount: number;
  startingChips: number;
  prizePool: number | null;
  currentLevel: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  timerElapsedSeconds: number;
  levelDuration: number;
};

type Season = {
  id: string;
  name: string;
  year: number;
};

type ResultsData = {
  tournament: Tournament;
  season: Season | null;
  results: TournamentPlayer[];
};

type BlindStructureResponse = {
  levels: BlindLevel[];
};

type ChipDenomination = {
  id: string;
  value: number;
  color: string;
  colorSecondary?: string | null;
  quantity?: number | null;
  order: number;
};

type TableSeat = {
  seatNumber: number | null;
  playerId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isEliminated: boolean;
};

type TablePlanData = {
  tableNumber: number;
  seats: TableSeat[];
  activeCount: number;
  totalCount: number;
};

type TablesPlanResponse = {
  tournamentId: string;
  tournamentName: string;
  tournamentStatus: string;
  tables: TablePlanData[];
  totalTables: number;
  totalActivePlayers: number;
  totalPlayers: number;
};

interface TvV3PageProps {
  tournamentId: string;
}

/**
 * Canonical TV View (v3) - Full featured spectator view
 *
 * Features:
 * - Audio TTS announcements (blind changes, breaks, milestones)
 * - Confetti animations on tournament finish
 * - Multiple visual themes
 * - Podium photo generator
 * - Circular timer visualization
 * - Top sharks/rebuyers sidebar
 *
 * @see docs/TV_CANONICAL.md
 */
export function TvV3Page({ tournamentId }: TvV3PageProps) {
  const searchParams = useSearchParams();
  const isFullscreen = searchParams.get('fullscreen') === '1';

  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [blindStructure, setBlindStructure] = useState<BlindLevel[] | null>(null);
  const [chips, setChips] = useState<ChipDenomination[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [serverTimerData, setServerTimerData] = useState<{
    secondsIntoCurrentLevel: number;
    timerStartedAt: string | null;
    timerPausedAt: string | null;
    fetchedAt: number;
  } | null>(null);

  // Audio management refs
  const countdownPlayedRef = useRef(false);
  const alert30sPlayedRef = useRef(false);
  const alert10sPlayedRef = useRef(false);
  const previousLevelRef = useRef<number>(0);
  const previousPlayerCountRef = useRef<number>(0);
  const confettiTriggeredRef = useRef(false);
  const photoCapturedRef = useRef(false);

  // TTS controls
  const [ttsVolume, setTtsVolume] = useState(1);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [blindCommentaryEnabled, setBlindCommentaryEnabledState] = useState(true);

  // Theme
  const [currentTheme, setCurrentTheme] = useState<TVTheme>(TV_THEMES[0]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Tables Plan Mode
  const [showTablesPlan, setShowTablesPlan] = useState(false);
  const [tablesPlanData, setTablesPlanData] = useState<TablesPlanResponse | null>(null);
  const [tablesPlanError, setTablesPlanError] = useState<string | null>(null);

  // Initialize TTS controls and theme from localStorage
  useEffect(() => {
    setTtsVolume(getTTSVolume());
    setTtsSpeed(getTTSSpeed());
    setBlindCommentaryEnabledState(getBlindCommentaryEnabled());

    // Load saved theme
    const savedTheme = getSavedTheme();
    setCurrentTheme(savedTheme);
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      applyThemeToElement(document.documentElement, currentTheme);
    }
  }, [currentTheme]);

  const handleThemeChange = (theme: TVTheme) => {
    setCurrentTheme(theme);
    saveTheme(theme.id);
    setShowThemeSelector(false);
  };

  // Fetch tables plan data
  const fetchTablesPlan = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables-plan`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setTablesPlanError('Non authentifié');
        } else if (response.status === 403) {
          setTablesPlanError('Accès refusé');
        } else {
          setTablesPlanError('Erreur de chargement');
        }
        setTablesPlanData(null);
        return;
      }

      const data = await response.json();
      setTablesPlanData(data);
      setTablesPlanError(null);
    } catch (error) {
      console.error('Error fetching tables plan:', error);
      setTablesPlanError('Erreur de connexion');
      setTablesPlanData(null);
    }
  };

  // Toggle tables plan view
  const handleToggleTablesPlan = () => {
    if (!showTablesPlan) {
      fetchTablesPlan();
    }
    setShowTablesPlan(!showTablesPlan);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [tournamentId]);

  // Refresh tables plan when visible
  useEffect(() => {
    if (showTablesPlan) {
      const interval = setInterval(fetchTablesPlan, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [showTablesPlan, tournamentId]);

  // Trigger confetti when tournament finishes
  useEffect(() => {
    if (resultsData?.tournament.status === 'FINISHED' && !confettiTriggeredRef.current) {
      confettiTriggeredRef.current = true;

      // Launch confetti
      const duration = 5000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Automatically capture podium photo after confetti settles (7 seconds)
      setTimeout(() => {
        if (!photoCapturedRef.current && resultsData?.tournament.name) {
          photoCapturedRef.current = true;
          capturePodiumPhoto(
            'podium-content',
            `podium_${resultsData.tournament.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`
          );
        }
      }, 7000);
    }
  }, [resultsData?.tournament.status, resultsData?.tournament.name]);

  // Update current time every second to trigger recalculation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [tournamentResponse, timerResponse, chipsResponse] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/timer`),
        fetch(`/api/tournaments/${tournamentId}/chips`),
      ]);

      if (tournamentResponse.ok) {
        const data = await tournamentResponse.json();

        // Get timer state if available
        let timerData = null;
        if (timerResponse.ok) {
          timerData = await timerResponse.json();
          // Store server timer data with timestamp
          setServerTimerData({
            secondsIntoCurrentLevel: timerData.secondsIntoCurrentLevel || 0,
            timerStartedAt: timerData.timerStartedAt,
            timerPausedAt: timerData.timerPausedAt,
            fetchedAt: Date.now(),
          });
        }

        // Transform data to match ResultsData structure
        const transformedData: ResultsData = {
          tournament: {
            id: data.id,
            name: data.name,
            date: data.date,
            status: data.status,
            type: data.type || 'TOURNAMENT',
            buyInAmount: data.buyInAmount,
            startingChips: data.startingChips,
            prizePool: data.prizePool,
            currentLevel: timerData?.currentLevel || data.currentLevel,
            timerStartedAt: data.timerStartedAt,
            timerPausedAt: data.timerPausedAt,
            timerElapsedSeconds: timerData?.secondsIntoCurrentLevel || data.timerElapsedSeconds || 0,
            levelDuration: data.levelDuration,
          },
          season: data.season,
          results: data.tournamentPlayers || [],
        };

        setResultsData(transformedData);
        setBlindStructure(data.blindLevels || []);
      }

      if (chipsResponse.ok) {
        const data = await chipsResponse.json();
        setChips(data.chips || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateTimeRemaining = () => {
    if (!resultsData?.tournament || !serverTimerData || !blindStructure) {
      setTimeRemaining(null);
      setTimeElapsed(0);
      return;
    }

    // Get the current level's specific duration
    const currentLevelData = blindStructure.find(
      (level) => level.level === resultsData.tournament.currentLevel
    );
    const duration = currentLevelData
      ? currentLevelData.duration * 60  // Use level-specific duration
      : resultsData.tournament.levelDuration * 60; // Fallback to default

    let currentElapsed = serverTimerData.secondsIntoCurrentLevel;

    // If timer is running (not paused), add time since last fetch
    if (serverTimerData.timerStartedAt && !serverTimerData.timerPausedAt) {
      const secondsSinceFetch = Math.floor((Date.now() - serverTimerData.fetchedAt) / 1000);
      currentElapsed += secondsSinceFetch;
    }

    const remaining = Math.max(0, duration - currentElapsed);
    setTimeRemaining(remaining);
    setTimeElapsed(currentElapsed);
  };

  // Recalculate time remaining when currentTime changes
  useEffect(() => {
    calculateTimeRemaining();
  }, [currentTime, serverTimerData, blindStructure, resultsData?.tournament.currentLevel]);

  // Play alerts at 30s, 10s, and 5s
  useEffect(() => {
    if (!serverTimerData?.timerStartedAt || serverTimerData?.timerPausedAt) return;

    // 30 seconds warning
    if (timeRemaining === 30 && !alert30sPlayedRef.current) {
      alert30sPlayedRef.current = true;
      playAlertSound('warning');
    }

    // 10 seconds warning
    if (timeRemaining === 10 && !alert10sPlayedRef.current) {
      alert10sPlayedRef.current = true;
      playAlertSound('urgent');
    }

    // 5 seconds countdown
    if (timeRemaining === 5 && !countdownPlayedRef.current) {
      countdownPlayedRef.current = true;
      playCountdown();
    }

    // Reset flags when time remaining changes significantly
    if (timeRemaining !== null && timeRemaining > 35) {
      alert30sPlayedRef.current = false;
      alert10sPlayedRef.current = false;
      countdownPlayedRef.current = false;
    }
  }, [timeRemaining, serverTimerData]);

  // Announce level changes
  useEffect(() => {
    if (!resultsData?.tournament || !blindStructure) return;

    const currentLevel = resultsData.tournament.currentLevel;

    // Check if level has changed
    if (previousLevelRef.current !== 0 && previousLevelRef.current !== currentLevel) {
      // Check if previous level had rebalanceTables flag - TD reminder!
      const previousLevelData = blindStructure.find(level => level.level === previousLevelRef.current);
      if (previousLevelData?.rebalanceTables) {
        // Announce rebalance reminder (always, regardless of blindCommentaryEnabled)
        announceRebalanceTables();
      }

      const currentLevelData = blindStructure.find(level => level.level === currentLevel);

      if (currentLevelData && blindCommentaryEnabled) {
        // Small delay if we announced rebalance to avoid overlap
        const delay = previousLevelData?.rebalanceTables ? 4000 : 0;

        setTimeout(() => {
          if (currentLevelData.isBreak) {
            // Announce break (only if commentary enabled)
            announceBreak(currentLevelData.duration);
          } else {
            // Get active players for random selection
            const activePlayers = resultsData?.results.filter((p) => p.finalRank === null) || [];
            const playerNicknames = activePlayers.map(p => p.player.nickname || p.player.firstName);

            // Announce new level (only if commentary enabled)
            announceLevelChange(
              currentLevelData.level,
              currentLevelData.smallBlind,
              currentLevelData.bigBlind,
              currentLevelData.ante,
              playerNicknames
            );
          }
        }, delay);
      }
    }

    // Update previous level
    previousLevelRef.current = currentLevel;
  }, [resultsData?.tournament.currentLevel, blindStructure, blindCommentaryEnabled]);

  // Announce players remaining milestones
  useEffect(() => {
    if (!resultsData) return;

    const activePlayers = resultsData.results.filter((p) => p.finalRank === null);
    const currentPlayerCount = activePlayers.length;

    // Check if player count changed and announce milestones
    if (previousPlayerCountRef.current !== 0 && previousPlayerCountRef.current !== currentPlayerCount) {
      // Announce at specific milestones: 9, 6, 3
      if ([9, 6, 3].includes(currentPlayerCount)) {
        announcePlayersRemaining(currentPlayerCount);
      }
    }

    // Update previous count
    previousPlayerCountRef.current = currentPlayerCount;
  }, [resultsData?.results]);

  // Keyboard shortcut: Space bar for pause/resume
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space bar
      if (e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();

        if (serverTimerData?.timerStartedAt && !serverTimerData?.timerPausedAt) {
          handlePause();
        } else if (serverTimerData?.timerPausedAt) {
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [serverTimerData]);

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/pause`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh data immediately
        await fetchData();
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/resume`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh data immediately
        await fetchData();
      }
    } catch (error) {
      console.error('Error resuming timer:', error);
    }
  };

  const handleVolumeChange = (value: number) => {
    setTtsVolume(value);
    setTTSVolume(value);
  };

  const handleSpeedChange = (value: number) => {
    setTtsSpeed(value);
    setTTSSpeed(value);
  };

  const handleBlindCommentaryToggle = (enabled: boolean) => {
    setBlindCommentaryEnabledState(enabled);
    setBlindCommentaryEnabled(enabled);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeWithHours = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate the best text color (black or white) based on background color luminance
  const getTextColor = (backgroundColor: string): string => {
    // Convert hex to RGB
    let color = backgroundColor.replace('#', '');

    // Handle 3-digit hex
    if (color.length === 3) {
      color = color.split('').map(c => c + c).join('');
    }

    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);

    // Calculate relative luminance using the formula
    // https://www.w3.org/TR/WCAG20-TECHS/G17.html
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  if (!resultsData) {
    return (
      <div className="min-h-screen bg-[hsl(220,18%,12%)] flex items-center justify-center">
        <div className="text-white text-2xl">Chargement...</div>
      </div>
    );
  }

  const { tournament, season, results } = resultsData;
  const currentBlindLevel = blindStructure?.find(
    (level) => level.level === tournament.currentLevel
  );
  const nextBlindLevel = blindStructure?.find(
    (level) => level.level === tournament.currentLevel + 1
  );

  // Find next break
  const nextBreak = blindStructure?.find(
    (level) => level.level > tournament.currentLevel && level.isBreak
  );

  // Calculate time until next break
  let timeUntilBreak = null;
  if (nextBreak && timeRemaining !== null) {
    const levelsUntilBreak = nextBreak.level - tournament.currentLevel;
    const remainingInCurrentLevel = timeRemaining;
    const levelsBetween = levelsUntilBreak - 1;
    timeUntilBreak = remainingInCurrentLevel + (levelsBetween * tournament.levelDuration * 60);
  }

  const rankedPlayers = results
    .filter((p) => p.finalRank !== null)
    .sort((a, b) => (a.finalRank || 999) - (b.finalRank || 999));
  const activePlayers = results.filter((p) => p.finalRank === null);
  const isCompleted = tournament.status === 'FINISHED';

  // Calculate total rebuys first
  const totalRebuys = results.reduce((sum, p) => sum + p.rebuysCount, 0);

  // Calculate average stack for active players (including rebuy chips)
  const totalChipsInPlay = activePlayers.length > 0
    ? (results.length * tournament.startingChips) + (totalRebuys * tournament.startingChips)
    : 0;
  const averageStack = activePlayers.length > 0
    ? Math.floor(totalChipsInPlay / activePlayers.length)
    : 0;

  // Calculate total prize pool (buy-ins + rebuys)
  const calculatedPrizePool = tournament.prizePool || ((results.length + totalRebuys) * tournament.buyInAmount);

  const tournamentTypeLabel = tournament.type === 'CHAMPIONSHIP' ? 'Texas Hold\'em No Limit' :
                               tournament.type === 'TOURNAMENT' ? 'Texas Hold\'em No Limit' :
                               tournament.type;

  // Top 3 Sharks (most eliminations)
  const topSharks = [...results]
    .filter((p) => p.eliminationsCount > 0)
    .sort((a, b) => b.eliminationsCount - a.eliminationsCount)
    .slice(0, 3);

  // Top 3 Rebuyers (most rebuys)
  const topRebuyers = [...results]
    .filter((p) => p.rebuysCount > 0)
    .sort((a, b) => b.rebuysCount - a.rebuysCount)
    .slice(0, 3);

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ backgroundColor: currentTheme.colors.background }}>
      {/* Header - Hidden in fullscreen mode */}
      {!isFullscreen && (
      <div className="py-4 px-8 border-b-4" style={{
        backgroundColor: currentTheme.colors.primary,
        borderBottomColor: currentTheme.colors.primaryDark
      }}>
        <h1 className="text-4xl font-bold text-center text-white drop-shadow-lg uppercase tracking-wider">
          {tournament.name || 'Tournoi de Poker'}
        </h1>
      </div>
      )}

      {/* Tournament Finished Screen */}
      {isCompleted ? (
        <div className={`flex items-center justify-center ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-80px)]'} bg-gradient-to-br relative`} style={{
          background: `linear-gradient(to bottom right, ${currentTheme.colors.background}, ${currentTheme.colors.backgroundLight})`
        }}>
          {/* Manual Photo Capture Buttons */}
          <div className="absolute top-8 right-8 flex gap-3 z-50">
            <button
              onClick={() => capturePodiumPhoto('podium-content', `podium_${tournament.name?.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`)}
              className="flex items-center gap-2 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all hover:opacity-90"
              style={{
                backgroundColor: currentTheme.colors.primary
              }}
              title="Télécharger la photo du podium"
            >
              <Download className="h-5 w-5" />
              <span>Télécharger</span>
            </button>
            <button
              onClick={() => sharePodiumPhoto('podium-content', tournament.name || 'Tournoi')}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-colors"
              title="Partager la photo du podium"
            >
              <Share2 className="h-5 w-5" />
              <span>Partager</span>
            </button>
          </div>

          <div id="podium-content" className="text-center space-y-12 p-12">
            <div className="text-9xl font-black drop-shadow-2xl uppercase tracking-wider animate-pulse" style={{ color: currentTheme.colors.primary }}>
              Terminé
            </div>

            {rankedPlayers.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-6">
                  <Trophy className="h-32 w-32 text-yellow-400 drop-shadow-2xl" />
                  <div className="text-left">
                    <div className="text-3xl text-white/80 mb-2">Vainqueur</div>
                    <div className="text-8xl font-black text-white drop-shadow-2xl">
                      {rankedPlayers[0].player.nickname || `${rankedPlayers[0].player.firstName} ${rankedPlayers[0].player.lastName}`}
                    </div>
                  </div>
                  <Trophy className="h-32 w-32 text-yellow-400 drop-shadow-2xl" />
                </div>

                {rankedPlayers.length > 1 && (
                  <div className="flex justify-center gap-12 mt-12">
                    {rankedPlayers[1] && (
                      <div className="text-center">
                        <div className="text-2xl text-white/60 mb-2">2ème place</div>
                        <div className="text-4xl font-bold text-white/90">
                          {rankedPlayers[1].player.nickname || `${rankedPlayers[1].player.firstName} ${rankedPlayers[1].player.lastName}`}
                        </div>
                      </div>
                    )}
                    {rankedPlayers[2] && (
                      <div className="text-center">
                        <div className="text-2xl text-white/60 mb-2">3ème place</div>
                        <div className="text-4xl font-bold text-white/90">
                          {rankedPlayers[2].player.nickname || `${rankedPlayers[2].player.firstName} ${rankedPlayers[2].player.lastName}`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
      <div className="flex h-[calc(100vh-80px)]">
        {/* LEFT PANEL - Hidden in fullscreen mode */}
        {!isFullscreen && (
        <div className="w-1/5 bg-[hsl(220,15%,18%)] p-6 space-y-8 border-r-2 border-[hsl(220,13%,30%)]">
          {/* Current Time */}
          <div className="text-center">
            <div className="text-white/80 text-lg font-semibold mb-2">Il est</div>
            <div className="text-6xl font-black text-white drop-shadow-lg">
              {format(currentTime, 'HH:mm:ss')}
            </div>
          </div>

          {/* Players Count */}
          <div className="text-center">
            <div className="text-white/80 text-lg font-semibold mb-2">Joueurs : {results.length}</div>
            <div className="text-5xl font-black text-white drop-shadow-lg">
              {activePlayers.length}
            </div>
            <div className="text-white/80 text-sm mt-1">en jeu</div>
          </div>

          {/* Average Stack */}
          <div className="text-center">
            <div className="text-white/80 text-lg font-semibold mb-2">Tapis moyen :</div>
            <div className="text-5xl font-black text-white drop-shadow-lg">
              {averageStack > 0 ? averageStack.toLocaleString() : '0'}
            </div>
            {currentBlindLevel && averageStack > 0 && (
              <div className="text-white/80 text-sm mt-1">
                {Math.floor(averageStack / currentBlindLevel.bigBlind)} BB
              </div>
            )}
          </div>

          {/* Time Elapsed */}
          <div className="text-center">
            <div className="text-white/80 text-lg font-semibold mb-2">Temps écoulé :</div>
            <div className="text-3xl font-bold text-white drop-shadow-lg">
              {formatTimeWithHours(timeElapsed)}
            </div>
          </div>
        </div>
        )}

        {/* CENTER PANEL */}
        <div className="flex-1 p-8 flex flex-col justify-center space-y-6" style={{ backgroundColor: currentTheme.colors.background }}>
          {/* Tournament Type */}
          <div className="border-2 rounded-xl py-3 px-6 text-center" style={{
            backgroundColor: currentTheme.colors.backgroundDark,
            borderColor: currentTheme.colors.border
          }}>
            <div className="text-3xl font-bold text-white">{tournamentTypeLabel}</div>
          </div>

          {/* Current Round */}
          {currentBlindLevel && !currentBlindLevel.isBreak && (
            <div className="border-2 rounded-xl py-3 px-6 text-center" style={{
              backgroundColor: currentTheme.colors.backgroundDark,
              borderColor: currentTheme.colors.primary
            }}>
              <div className="text-3xl font-bold" style={{ color: currentTheme.colors.primaryLight }}>Round : {currentBlindLevel.level}</div>
            </div>
          )}

          {/* Main Timer */}
          <div className="flex items-center justify-center gap-8 relative">
            {/* Circular Timer */}
            <CircularTimer
              timeRemaining={timeRemaining}
              totalDuration={currentBlindLevel ? currentBlindLevel.duration * 60 : tournament.levelDuration * 60}
              size={280}
              strokeWidth={16}
            />

            {/* Time Display */}
            <div className="flex flex-col items-center gap-2">
              <div className={`text-[8rem] font-black leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] ${
                timeRemaining !== null && timeRemaining < 60
                  ? 'text-red-500 animate-pulse'
                  : timeRemaining !== null && timeRemaining < 120
                  ? 'text-orange-400'
                  : 'text-white'
              }`}>
                {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
              </div>
              {/* Pause indicator */}
              {serverTimerData?.timerPausedAt && (
                <div className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold text-2xl animate-pulse shadow-lg">
                  ⏸ PAUSE (Espace pour reprendre)
                </div>
              )}
            </div>
          </div>

          {/* Current Blinds */}
          {currentBlindLevel && !currentBlindLevel.isBreak ? (
            <div className="border-2 rounded-xl py-4 px-6 text-center" style={{
              backgroundColor: currentTheme.colors.backgroundDark,
              borderColor: currentTheme.colors.primary
            }}>
              <div className="text-5xl font-black text-white">
                Blinds : {currentBlindLevel.smallBlind.toLocaleString()} / {currentBlindLevel.bigBlind.toLocaleString()}
                {currentBlindLevel.ante > 0 && ` (${currentBlindLevel.ante.toLocaleString()})`}
              </div>
            </div>
          ) : currentBlindLevel && currentBlindLevel.isBreak ? (
            <div className="bg-blue-500/20 border-2 border-blue-400 rounded-xl py-4 px-6 text-center">
              <div className="text-5xl font-black text-blue-300">☕ PAUSE</div>
            </div>
          ) : (
            <div className="border-2 rounded-xl py-4 px-6 text-center" style={{
              backgroundColor: currentTheme.colors.backgroundDark,
              borderColor: currentTheme.colors.border
            }}>
              <div className="text-3xl font-bold text-white/50">En attente du démarrage...</div>
            </div>
          )}

          {/* Reassign Tables Indicator */}
          {currentBlindLevel?.rebalanceTables && (
            <div className="bg-orange-500/20 border-2 border-orange-400 rounded-xl py-3 px-6 text-center animate-pulse">
              <div className="text-2xl font-bold text-orange-300 flex items-center justify-center gap-3">
                <LayoutGrid className="h-7 w-7" />
                Réassignation des tables à la fin de ce niveau
                <LayoutGrid className="h-7 w-7" />
              </div>
            </div>
          )}

          {/* Next Blinds */}
          {nextBlindLevel && !nextBlindLevel.isBreak && (
            <div className="border rounded-xl py-3 px-6 text-center" style={{
              backgroundColor: currentTheme.colors.backgroundLight,
              borderColor: currentTheme.colors.border
            }}>
              <div className="text-2xl font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                Prochaines Blinds : {nextBlindLevel.smallBlind.toLocaleString()} / {nextBlindLevel.bigBlind.toLocaleString()}
                {nextBlindLevel.ante > 0 && ` (${nextBlindLevel.ante.toLocaleString()})`}
              </div>
            </div>
          )}

          {/* Next break info */}
          {timeUntilBreak !== null && nextBreak && (
            <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl py-3 px-6 text-center">
              <div className="text-xl font-bold text-blue-300">
                Prochain break dans : {formatTimeWithHours(timeUntilBreak)}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Hidden in fullscreen mode */}
        {!isFullscreen && (
        <div className="w-1/5 bg-[hsl(220,15%,18%)] p-6 space-y-6 border-l-2 border-[hsl(220,13%,30%)]">
          {/* Prize Pool */}
          <div className="text-center">
            <div className="text-white/80 text-lg font-semibold mb-2 italic">Pot Total :</div>
            <div className="text-5xl font-black text-white drop-shadow-lg">
              {calculatedPrizePool.toFixed(0)} €
            </div>
          </div>

          {/* Chip Denominations */}
          {chips.length > 0 ? (
            <div className="space-y-3">
              {chips.map((chip) => (
                <div key={chip.id} className="flex items-center gap-3 justify-between">
                  <div
                    className="w-14 h-14 rounded-full border-4 border-white shadow-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                    style={{
                      backgroundColor: chip.color,
                      color: getTextColor(chip.color),
                    }}
                  >
                    {chip.value >= 1000 ? `${chip.value / 1000}K` : chip.value}
                  </div>
                  <div className="text-3xl font-black text-white drop-shadow-lg">
                    {chip.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/60 text-sm">
              Aucun jeton configuré
            </div>
          )}
        </div>
        )}
      </div>
      )}

      {/* Bottom Section - Leaderboard */}
      {false && rankedPlayers.length > 0 && (
        <div className="bg-[hsl(220,15%,18%)] border-t-4 border-[hsl(142,71%,45%)]">
          <div className="px-8 py-4 pr-96">
            <h2 className="text-2xl font-bold mb-3 text-center text-[hsl(142,71%,55%)]">
              {isCompleted ? 'CLASSEMENT FINAL' : 'JOUEURS ÉLIMINÉS'}
            </h2>
            <div className="grid grid-cols-5 gap-4">
              {rankedPlayers.slice(0, 5).map((player) => (
                <div
                  key={player.id}
                  className={`flex flex-col items-center p-3 rounded-xl ${
                    player.finalRank === 1
                      ? 'bg-gradient-to-b from-yellow-500/30 to-yellow-600/30 border-2 border-yellow-500'
                      : player.finalRank === 2
                      ? 'bg-gradient-to-b from-gray-400/30 to-gray-500/30 border-2 border-gray-400'
                      : player.finalRank === 3
                      ? 'bg-gradient-to-b from-orange-600/30 to-orange-700/30 border-2 border-orange-600'
                      : 'bg-[hsl(220,13%,25%)] border border-[hsl(220,13%,30%)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {player.finalRank !== null && player.finalRank <= 3 && (
                      <Trophy
                        className={`h-6 w-6 ${
                          player.finalRank === 1
                            ? 'text-yellow-400'
                            : player.finalRank === 2
                            ? 'text-gray-400'
                            : 'text-orange-600'
                        }`}
                      />
                    )}
                    <span className="text-2xl font-bold text-white">#{player.finalRank}</span>
                  </div>
                  <div className="text-lg font-bold text-center">
                    {player.player.firstName} {player.player.lastName}
                  </div>
                  <div className="text-sm text-slate-400">{player.player.nickname}</div>
                  {season && isCompleted && (
                    <div className="mt-2 flex gap-3 text-sm">
                      {player.eliminationsCount > 0 && (
                        <div className="text-red-400 font-bold">
                          {player.eliminationsCount} élim.
                        </div>
                      )}
                      <div className="text-green-400 font-bold">{player.totalPoints} pts</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tables Plan Overlay - Large modal for TV readability */}
      {showTablesPlan && (
        <div className="fixed inset-0 z-[9998] bg-black/85 flex items-center justify-center p-4">
          <div
            className="w-[92vw] h-[88vh] overflow-hidden rounded-3xl p-8 flex flex-col"
            style={{ backgroundColor: currentTheme.colors.backgroundDark }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <h2 className="text-4xl font-bold text-white flex items-center gap-4">
                <LayoutGrid className="h-10 w-10" style={{ color: currentTheme.colors.primary }} />
                Plan des Tables
              </h2>
              <button
                onClick={() => setShowTablesPlan(false)}
                className="text-white/60 hover:text-white text-4xl font-bold w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {tablesPlanError ? (
                <div className="text-center py-16">
                  <div className="text-red-400 text-2xl font-bold mb-3">{tablesPlanError}</div>
                  <div className="text-white/60 text-lg">
                    {tablesPlanError === 'Accès refusé' && 'Seuls les admins et TD assignés peuvent voir le plan des tables.'}
                    {tablesPlanError === 'Non authentifié' && 'Vous devez être connecté pour voir le plan des tables.'}
                  </div>
                </div>
              ) : !tablesPlanData ? (
                <div className="text-center py-16">
                  <div className="text-white/60 text-2xl">Chargement...</div>
                </div>
              ) : tablesPlanData.tables.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-white/60 text-2xl">Aucune table configurée</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {tablesPlanData.tables.map((table) => (
                      <div
                        key={table.tableNumber}
                        className="rounded-2xl p-5 border-2"
                        style={{
                          backgroundColor: currentTheme.colors.backgroundLight,
                          borderColor: currentTheme.colors.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-2xl font-bold" style={{ color: currentTheme.colors.primary }}>
                            Table {table.tableNumber}
                          </h3>
                          <span className="text-lg text-white/60 font-semibold">
                            {table.activeCount}/{table.totalCount}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {table.seats.map((seat, idx) => (
                            <div
                              key={seat.playerId}
                              className={`flex items-center justify-between gap-4 text-lg py-3 px-4 rounded-xl ${
                                seat.isEliminated ? 'opacity-40' : ''
                              }`}
                              style={{
                                backgroundColor: seat.isEliminated
                                  ? 'rgba(255,255,255,0.3)'
                                  : 'rgba(255,255,255,0.9)',
                              }}
                            >
                              <span className="text-slate-500 text-sm font-medium whitespace-nowrap">
                                Siège {seat.seatNumber ?? idx + 1}
                              </span>
                              <span className={`text-slate-900 font-bold text-xl uppercase truncate ${
                                seat.isEliminated ? 'line-through' : ''
                              }`}>
                                {seat.nickname || `${seat.firstName} ${seat.lastName.charAt(0)}.`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer - Stats */}
            {tablesPlanData && tablesPlanData.tables.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10 text-center text-white/60 text-lg flex-shrink-0">
                {tablesPlanData.totalTables} tables • {tablesPlanData.totalActivePlayers} joueurs actifs / {tablesPlanData.totalPlayers} total
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Right - TTS Controls & Theme Selector & Tables Plan Toggle */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-3">
        {/* Tables Plan Toggle */}
        <button
          onClick={handleToggleTablesPlan}
          className={`flex items-center gap-2 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-2xl transition-all ${
            showTablesPlan ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''
          }`}
          style={{
            backgroundColor: showTablesPlan ? currentTheme.colors.primary : 'hsl(220,15%,18%)',
            borderColor: currentTheme.colors.primary,
            borderWidth: '2px',
            borderStyle: 'solid',
          }}
        >
          <LayoutGrid className="h-5 w-5" />
          <span>{showTablesPlan ? 'Masquer Tables' : 'Plan des Tables'}</span>
        </button>

        {/* Theme Selector */}
        <div className="bg-[hsl(220,15%,18%)] border-2 rounded-xl p-4 shadow-2xl" style={{ borderColor: currentTheme.colors.primary }}>
          <button
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className="flex items-center gap-2 text-white font-bold text-sm mb-2 transition-colors w-full"
            style={{ color: showThemeSelector ? currentTheme.colors.primaryLight : '#ffffff' }}
          >
            <Palette className="h-5 w-5" />
            <span>Thème: {currentTheme.name}</span>
            <span className="text-xs ml-auto">{showThemeSelector ? '▼' : '▶'}</span>
          </button>

          {showThemeSelector && (
            <div className="space-y-2 pt-2 border-t border-white/20 max-h-[300px] overflow-y-auto">
              {TV_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-white/10"
                  style={{
                    backgroundColor: currentTheme.id === theme.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <span className="text-sm text-white font-medium">{theme.name}</span>
                  {currentTheme.id === theme.id && (
                    <span className="ml-auto text-xs" style={{ color: theme.colors.primary }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TTS Controls */}
        <div className="bg-[hsl(220,15%,18%)] border-2 rounded-xl p-4 shadow-2xl" style={{ borderColor: currentTheme.colors.primary }}>
          <button
            onClick={() => setShowControls(!showControls)}
            className="flex items-center gap-2 text-white font-bold text-sm mb-2 transition-colors w-full"
            style={{ color: showControls ? currentTheme.colors.primaryLight : '#ffffff' }}
          >
            <Volume2 className="h-5 w-5" />
            <span>Contrôles TTS</span>
            <span className="text-xs ml-auto">{showControls ? '▼' : '▶'}</span>
          </button>

          {showControls && (
            <div className="space-y-3 pt-2 border-t border-white/20">
              {/* Volume Control */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-white/80 flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    Volume
                  </label>
                  <span className="text-xs text-white font-bold">{Math.round(ttsVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={ttsVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: currentTheme.colors.primary,
                  }}
                />
              </div>

              {/* Speed Control */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-white/80 flex items-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Vitesse
                  </label>
                  <span className="text-xs text-white font-bold">{ttsSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  style={{
                    accentColor: currentTheme.colors.primary,
                  }}
                />
              </div>

              {/* Blind Commentary Toggle */}
              <div>
                <button
                  onClick={() => handleBlindCommentaryToggle(!blindCommentaryEnabled)}
                  className="flex items-center gap-2 w-full p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: blindCommentaryEnabled ? `${currentTheme.colors.primary}30` : 'transparent',
                    border: `1px solid ${blindCommentaryEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.2)'}`,
                  }}
                >
                  <MessageSquare className="h-4 w-4" style={{ color: blindCommentaryEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.5)' }} />
                  <span className="text-xs text-white/80">Commentaires blinds</span>
                  <span
                    className="ml-auto text-xs font-bold"
                    style={{ color: blindCommentaryEnabled ? currentTheme.colors.primary : 'rgba(255,255,255,0.5)' }}
                  >
                    {blindCommentaryEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
                <p className="text-[10px] text-white/50 mt-1 pl-1">
                  Sons décompte toujours actifs
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Left - Top Sharks & Rebuyers */}
      {(topSharks.length > 0 || topRebuyers.length > 0) && (
        <div className="fixed bottom-4 left-4 flex gap-4 z-[9999]">
          {/* Top 3 Sharks */}
          {topSharks.length > 0 && (
            <div className="bg-[hsl(220,15%,18%)] border-2 border-red-500 rounded-xl p-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🦈</span>
                <h3 className="text-sm font-bold text-red-400 uppercase">Top Sharks</h3>
              </div>
              <div className="space-y-1">
                {topSharks.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-2 text-xs">
                    <span className="text-white/80 font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">
                      {player.player.nickname || `${player.player.firstName} ${player.player.lastName.charAt(0)}.`}
                    </span>
                    <span className="text-red-400 font-bold ml-auto">
                      {player.eliminationsCount} 💀
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top 3 Rebuyers */}
          {topRebuyers.length > 0 && (
            <div className="bg-[hsl(220,15%,18%)] border-2 border-yellow-500 rounded-xl p-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💸</span>
                <h3 className="text-sm font-bold text-yellow-400 uppercase">Top Recavers</h3>
              </div>
              <div className="space-y-1">
                {topRebuyers.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-2 text-xs">
                    <span className="text-white/80 font-bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-white font-medium">
                      {player.player.nickname || `${player.player.firstName} ${player.player.lastName.charAt(0)}.`}
                    </span>
                    <span className="text-yellow-400 font-bold ml-auto">
                      {player.rebuysCount} 🔄
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
