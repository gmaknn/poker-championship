'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Trophy, Users, DollarSign, Clock, LayoutGrid, Coins, Play, Pause, Timer, Skull, RefreshCw } from 'lucide-react';
import { playCountdown, announceLevelChange, announceBreak, playAlertSound, announcePlayersRemaining, announceRebalanceTables, getTTSVolume, getTTSSpeed, setTTSVolume, setTTSSpeed, getBlindCommentaryEnabled, setBlindCommentaryEnabled } from '@/lib/audioManager';
import { useTournamentEvent } from '@/contexts/SocketContext';
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
  lightRebuyUsed: boolean;
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
  lightRebuyAmount: number;
  startingChips: number;
  prizePool: number | null;
  prizePoolAdjustment: number;
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

type LeaderboardPlayer = {
  rank: number;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    avatar: string | null;
  };
  totalPoints: number;
  tournamentsPlayed: number;
  victories: number;
  podiums: number;
};

type LeaderboardResponse = {
  season: {
    id: string;
    name: string;
    year: number;
    totalTournamentsCount: number | null;
    bestTournamentsCount: number | null;
    completedTournamentsCount: number;
  };
  leaderboard: LeaderboardPlayer[];
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

  // Chips Modal
  const [showChipsModal, setShowChipsModal] = useState(false);

  // Championship Leaderboard
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);

  // Time (temps de réflexion) state
  const [timeState, setTimeState] = useState<{
    isActive: boolean;
    remainingSeconds: number;
    totalSeconds: number;
  } | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Elimination notification state
  const [eliminationNotification, setEliminationNotification] = useState<{
    type: 'elimination' | 'bust';
    eliminatedName: string;
    eliminatorName: string;
    rank?: number;
    isLeaderKill?: boolean;
  } | null>(null);
  const eliminationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile detection
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 768 || window.innerHeight < 500;
      const isPortrait = window.innerHeight > window.innerWidth;
      const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight < 500;
      setIsMobilePortrait(isMobile && isPortrait);
      setIsMobileLandscape(isLandscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // Timer control state for mobile
  const [isTogglingTimer, setIsTogglingTimer] = useState(false);
  const [timerToast, setTimerToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);


  // Initialize TTS controls and theme from localStorage
  useEffect(() => {
    setTtsVolume(getTTSVolume());
    setTtsSpeed(getTTSSpeed());
    setBlindCommentaryEnabledState(getBlindCommentaryEnabled());

    // Load saved theme
    const savedTheme = getSavedTheme();
    setCurrentTheme(savedTheme);
  }, []);

  // Time (temps de réflexion) handlers
  const handleTimeStarted = useCallback((data: { tournamentId: string; duration: number; startedAt: Date }) => {
    console.log('[Time] Time called:', data);
    setTimeState({
      isActive: true,
      remainingSeconds: data.duration,
      totalSeconds: data.duration,
    });
  }, []);

  const handleTimeEnded = useCallback(() => {
    console.log('[Time] Time ended');
    // Keep display for 2 seconds before hiding
    setTimeout(() => {
      setTimeState(null);
    }, 2000);
  }, []);

  const handleTimeCancelled = useCallback(() => {
    console.log('[Time] Time cancelled');
    setTimeState(null);
  }, []);

  // Listen for Time events via Socket.IO
  useTournamentEvent(tournamentId, 'tournament:time-called', handleTimeStarted);
  useTournamentEvent(tournamentId, 'tournament:time-ended', handleTimeEnded);
  useTournamentEvent(tournamentId, 'tournament:time-cancelled', handleTimeCancelled);

  // Time countdown effect
  useEffect(() => {
    if (timeState?.isActive && timeState.remainingSeconds > 0) {
      timeIntervalRef.current = setInterval(() => {
        setTimeState((prev) => {
          if (!prev || prev.remainingSeconds <= 1) {
            // Time finished - play sound and mark as inactive
            if (prev?.remainingSeconds === 1) {
              playAlertSound('warning');
            }
            return prev ? { ...prev, remainingSeconds: 0, isActive: false } : null;
          }
          // Play beep in last 5 seconds
          if (prev.remainingSeconds <= 6 && prev.remainingSeconds > 1) {
            playCountdown();
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);

      return () => {
        if (timeIntervalRef.current) {
          clearInterval(timeIntervalRef.current);
        }
      };
    }
  }, [timeState?.isActive]);

  // Auto-hide Time display after it ends
  useEffect(() => {
    if (timeState && !timeState.isActive && timeState.remainingSeconds === 0) {
      const hideTimeout = setTimeout(() => {
        setTimeState(null);
      }, 2000);
      return () => clearTimeout(hideTimeout);
    }
  }, [timeState?.isActive, timeState?.remainingSeconds]);

  // Elimination notification handlers
  const handleEliminationEvent = useCallback((data: {
    tournamentId: string;
    eliminatedId: string;
    eliminatedName: string;
    eliminatorId: string;
    eliminatorName: string;
    rank: number;
    level: number;
    isLeaderKill: boolean;
  }) => {
    console.log('[Elimination] Player eliminated:', data);

    // Clear any existing timeout
    if (eliminationTimeoutRef.current) {
      clearTimeout(eliminationTimeoutRef.current);
    }

    // Show notification
    setEliminationNotification({
      type: 'elimination',
      eliminatedName: data.eliminatedName,
      eliminatorName: data.eliminatorName,
      rank: data.rank,
      isLeaderKill: data.isLeaderKill,
    });

    // Play alert sound
    playAlertSound('warning');

    // Auto-hide after 7 seconds
    eliminationTimeoutRef.current = setTimeout(() => {
      setEliminationNotification(null);
    }, 7000);
  }, []);

  const handleBustEvent = useCallback((data: {
    tournamentId: string;
    eliminatedId: string;
    eliminatedName: string;
    killerId: string | null;
    killerName: string | null;
    level: number;
  }) => {
    console.log('[Bust] Player busted:', data);

    // Clear any existing timeout
    if (eliminationTimeoutRef.current) {
      clearTimeout(eliminationTimeoutRef.current);
    }

    // Show notification (only if killer is known)
    if (data.killerName) {
      setEliminationNotification({
        type: 'bust',
        eliminatedName: data.eliminatedName,
        eliminatorName: data.killerName,
      });

      // Play alert sound (lighter for bust)
      playAlertSound('warning');

      // Auto-hide after 6 seconds
      eliminationTimeoutRef.current = setTimeout(() => {
        setEliminationNotification(null);
      }, 6000);
    }
  }, []);

  // Listen for elimination events via Socket.IO
  useTournamentEvent(tournamentId, 'elimination:player_out', handleEliminationEvent);
  useTournamentEvent(tournamentId, 'bust:player_busted', handleBustEvent);

  // Cleanup elimination timeout on unmount
  useEffect(() => {
    return () => {
      if (eliminationTimeoutRef.current) {
        clearTimeout(eliminationTimeoutRef.current);
      }
    };
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

  // Toggle timer play/pause
  const handleToggleTimer = async (e?: React.MouseEvent | React.TouchEvent) => {
    // Debug: Log every call to help diagnose mobile issues
    const isPaused = !!serverTimerData?.timerPausedAt;
    const debugInfo = `isPaused: ${isPaused}, isTogglingTimer: ${isTogglingTimer}`;
    console.log(`[Timer] handleToggleTimer called - ${debugInfo}`);

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isTogglingTimer) {
      console.log('[Timer] Already toggling, ignoring');
      return;
    }

    setIsTogglingTimer(true);
    setTimerToast(null);
    try {
      const endpoint = isPaused ? 'resume' : 'pause';
      console.log(`[Timer] Calling API: /api/tournaments/${tournamentId}/timer/${endpoint}`);
      const response = await fetch(`/api/tournaments/${tournamentId}/timer/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Timer] Failed to ${endpoint} timer:`, response.status, errorData);
        setTimerToast({
          message: errorData.error || `Erreur ${response.status}`,
          type: 'error'
        });
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.log(`[Timer] Timer ${endpoint} successful`, responseData);

        // Update local state immediately with new timer data
        setServerTimerData(prev => prev ? {
          ...prev,
          timerPausedAt: isPaused ? null : new Date().toISOString(),
          fetchedAt: Date.now(),
        } : null);

        setTimerToast({
          message: isPaused ? 'Timer relancé' : 'Timer en pause',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('[Timer] Error toggling timer:', error);
      setTimerToast({
        message: 'Erreur de connexion',
        type: 'error'
      });
    } finally {
      setIsTogglingTimer(false);
      // Auto-hide toast after 3 seconds
      setTimeout(() => setTimerToast(null), 3000);
    }
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
      // Fermer les autres modales avant d'ouvrir celle-ci
      setShowChipsModal(false);
      setShowLeaderboardModal(false);
      fetchTablesPlan();
    }
    setShowTablesPlan(!showTablesPlan);
  };

  // Fetch championship leaderboard
  const fetchLeaderboard = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/seasons/${seasonId}/leaderboard-public`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
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

  // Fetch leaderboard when season is available (for CHAMPIONSHIP tournaments)
  useEffect(() => {
    if (resultsData?.season?.id && resultsData?.tournament?.type === 'CHAMPIONSHIP') {
      fetchLeaderboard(resultsData.season.id);
      // Refresh leaderboard every 30 seconds
      const interval = setInterval(() => fetchLeaderboard(resultsData.season!.id), 30000);
      return () => clearInterval(interval);
    }
  }, [resultsData?.season?.id, resultsData?.tournament?.type]);

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
            lightRebuyAmount: data.lightRebuyAmount || 5,
            startingChips: data.startingChips,
            prizePool: data.prizePool,
            prizePoolAdjustment: data.prizePoolAdjustment || 0,
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

  // Calculate total prize pool (buy-ins + rebuys standard + light rebuys + adjustment)
  const totalLightRebuys = results.filter(p => p.lightRebuyUsed).length;
  const calculatedPrizePool = tournament.prizePool || (
    (results.length * tournament.buyInAmount) +  // Buy-ins
    (totalRebuys * tournament.buyInAmount) +  // Standard rebuys
    (totalLightRebuys * tournament.lightRebuyAmount) +  // Light rebuys
    (tournament.prizePoolAdjustment || 0)  // Ajustement manuel
  );

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
      <div className={`border-b-4 ${isMobilePortrait ? 'py-2 px-3' : isMobileLandscape ? 'py-1 px-3' : 'py-4 px-8'}`} style={{
        backgroundColor: currentTheme.colors.primary,
        borderBottomColor: currentTheme.colors.primaryDark
      }}>
        <h1 className={`font-bold text-center text-white drop-shadow-lg uppercase tracking-wider ${isMobilePortrait ? 'text-lg leading-tight' : isMobileLandscape ? 'text-base' : 'text-4xl'}`}>
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

          <div id="podium-content" className="text-center space-y-6 md:space-y-12 p-4 md:p-12 max-w-full overflow-hidden">
            <div className="text-4xl sm:text-6xl md:text-9xl font-black drop-shadow-2xl uppercase tracking-wider animate-pulse" style={{ color: currentTheme.colors.primary }}>
              Terminé
            </div>

            {rankedPlayers.length > 0 && (
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                  <Trophy className="h-16 w-16 md:h-32 md:w-32 text-yellow-400 drop-shadow-2xl hidden md:block" />
                  <div className="text-center md:text-left">
                    <div className="flex items-center justify-center gap-2 md:hidden mb-2">
                      <Trophy className="h-8 w-8 text-yellow-400" />
                      <span className="text-xl text-white/80">Vainqueur</span>
                      <Trophy className="h-8 w-8 text-yellow-400" />
                    </div>
                    <div className="text-xl text-white/80 mb-2 hidden md:block">Vainqueur</div>
                    <div className="text-3xl sm:text-5xl md:text-8xl font-black text-white drop-shadow-2xl break-words">
                      {rankedPlayers[0].player.nickname || `${rankedPlayers[0].player.firstName} ${rankedPlayers[0].player.lastName}`}
                    </div>
                  </div>
                  <Trophy className="h-16 w-16 md:h-32 md:w-32 text-yellow-400 drop-shadow-2xl hidden md:block" />
                </div>

                {rankedPlayers.length > 1 && (
                  <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-12 mt-4 md:mt-12">
                    {rankedPlayers[1] && (
                      <div className="text-center">
                        <div className="text-lg md:text-2xl text-white/60 mb-1 md:mb-2">2ème place</div>
                        <div className="text-2xl md:text-4xl font-bold text-white/90">
                          {rankedPlayers[1].player.nickname || `${rankedPlayers[1].player.firstName} ${rankedPlayers[1].player.lastName}`}
                        </div>
                      </div>
                    )}
                    {rankedPlayers[2] && (
                      <div className="text-center">
                        <div className="text-lg md:text-2xl text-white/60 mb-1 md:mb-2">3ème place</div>
                        <div className="text-2xl md:text-4xl font-bold text-white/90">
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
      ) : isMobilePortrait ? (
        /* MOBILE PORTRAIT LAYOUT - Single column with essential info */
        <div className="flex flex-col h-[calc(100vh-60px)] overflow-y-auto relative" style={{ backgroundColor: currentTheme.colors.background }}>
          {/* Compact Header - Players + Prize */}
          <div className="flex justify-between items-center px-3 py-2 border-b" style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.backgroundDark }}>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
              <span className="text-2xl font-black text-white">{activePlayers.length}</span>
              <span className="text-white/60 text-sm">/{results.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
              <span className="text-xl font-bold text-white">{calculatedPrizePool.toFixed(0)}€</span>
            </div>
          </div>

          {/* Current Round Badge */}
          {currentBlindLevel && !currentBlindLevel.isBreak && (
            <div className="text-center py-2 px-3" style={{ backgroundColor: currentTheme.colors.backgroundLight }}>
              <span className="text-lg font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                Round {currentBlindLevel.level}
              </span>
            </div>
          )}

          {/* Main Timer - Centered */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-h-0">
            {/* Circular Timer (smaller on mobile) */}
            <div className="mb-3">
              <CircularTimer
                timeRemaining={timeRemaining}
                totalDuration={currentBlindLevel ? currentBlindLevel.duration * 60 : tournament.levelDuration * 60}
                size={160}
                strokeWidth={10}
              />
            </div>

            {/* Time Display */}
            <div className={`text-6xl font-black leading-none mb-2 ${
              timeRemaining !== null && timeRemaining < 60
                ? 'text-red-500 animate-pulse'
                : timeRemaining !== null && timeRemaining < 120
                ? 'text-orange-400'
                : 'text-white'
            }`}>
              {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
            </div>

            {/* Pause indicator (display only) */}
            {serverTimerData?.timerPausedAt && (
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-lg animate-pulse mb-2">
                ⏸ PAUSE
              </div>
            )}

            {/* Current Blinds */}
            {currentBlindLevel && !currentBlindLevel.isBreak ? (
              <div className="border-2 rounded-xl py-3 px-4 text-center w-full max-w-sm" style={{
                backgroundColor: currentTheme.colors.backgroundDark,
                borderColor: currentTheme.colors.primary
              }}>
                <div className="text-xs text-white/60 mb-1">Blinds</div>
                <div className="text-2xl font-black text-white">
                  {currentBlindLevel.smallBlind.toLocaleString()} / {currentBlindLevel.bigBlind.toLocaleString()}
                </div>
                {currentBlindLevel.ante > 0 && (
                  <div className="text-lg font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                    Ante: {currentBlindLevel.ante.toLocaleString()}
                  </div>
                )}
              </div>
            ) : currentBlindLevel && currentBlindLevel.isBreak ? (
              <div className="bg-blue-500/20 border-2 border-blue-400 rounded-xl py-3 px-4 text-center w-full max-w-sm">
                <div className="text-3xl font-black text-blue-300">☕ PAUSE</div>
              </div>
            ) : null}

            {/* Next Blinds (compact) */}
            {nextBlindLevel && !nextBlindLevel.isBreak && (
              <div className="mt-3 text-center">
                <span className="text-white/60 text-sm">Suivant: </span>
                <span className="text-lg font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                  {nextBlindLevel.smallBlind.toLocaleString()} / {nextBlindLevel.bigBlind.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Bottom Stats Bar */}
          <div className="flex justify-around items-center px-3 py-3 border-t" style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.backgroundDark }}>
            <div className="text-center">
              <div className="text-white/60 text-xs">Tapis moy.</div>
              <div className="text-lg font-bold text-white">{averageStack > 0 ? averageStack.toLocaleString() : '0'}</div>
              {currentBlindLevel && averageStack > 0 && (
                <div className="text-xs" style={{ color: currentTheme.colors.primaryLight }}>
                  {Math.floor(averageStack / currentBlindLevel.bigBlind)} BB
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-white/60 text-xs">Temps</div>
              <div className="text-lg font-bold text-white">{formatTimeWithHours(timeElapsed)}</div>
            </div>
            <div className="text-center">
              <div className="text-white/60 text-xs">Heure</div>
              <div className="text-lg font-bold text-white">{format(currentTime, 'HH:mm')}</div>
            </div>
          </div>

          {/* Reassign Tables Indicator (mobile compact) */}
          {currentBlindLevel?.rebalanceTables && (
            <div className="bg-orange-500/20 border-t-2 border-orange-400 py-2 px-3 text-center animate-pulse">
              <div className="text-sm font-bold text-orange-300 flex items-center justify-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Réassignation des tables
              </div>
            </div>
          )}

          {/* Bouton Play/Pause - toujours visible, l'API vérifie les permissions */}
          {tournament.status === 'IN_PROGRESS' && (
            <button
              onPointerDown={(e) => {
                // Use pointerdown for unified touch/mouse handling
                e.preventDefault();
                e.stopPropagation();
                console.log('[Timer] Mobile portrait button: pointerdown');
                handleToggleTimer(e as unknown as React.MouseEvent);
              }}
              style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent', backgroundColor: serverTimerData?.timerPausedAt ? '#22c55e' : '#ef4444' }}
              className="fixed bottom-4 right-4 z-[9999] w-16 h-16 rounded-full shadow-2xl flex items-center justify-center select-none"
            >
              {isTogglingTimer ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : serverTimerData?.timerPausedAt ? (
                <Play className="h-8 w-8 text-white ml-1" />
              ) : (
                <Pause className="h-8 w-8 text-white" />
              )}
            </button>
          )}

          {/* Timer Toast Notification */}
          {timerToast && (
            <div
              className={`fixed bottom-20 left-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
                timerToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              {timerToast.message}
            </div>
          )}
        </div>
      ) : isMobileLandscape ? (
        /* MOBILE LANDSCAPE LAYOUT - Horizontal optimized */
        <div className="flex h-[calc(100vh-40px)] overflow-hidden relative" style={{ backgroundColor: currentTheme.colors.background }}>
          {/* Left Section - Timer & Blinds */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-2">
            {/* Timer Row */}
            <div className="flex items-center gap-4">
              {/* Circular Timer (smaller in landscape) */}
              <CircularTimer
                timeRemaining={timeRemaining}
                totalDuration={currentBlindLevel ? currentBlindLevel.duration * 60 : tournament.levelDuration * 60}
                size={100}
                strokeWidth={8}
              />

              {/* Time Display */}
              <div className="flex flex-col items-center">
                <div className={`text-5xl font-black leading-none ${
                  timeRemaining !== null && timeRemaining < 60
                    ? 'text-red-500 animate-pulse'
                    : timeRemaining !== null && timeRemaining < 120
                    ? 'text-orange-400'
                    : 'text-white'
                }`}>
                  {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                </div>

                {/* Pause indicator (display only) */}
                {serverTimerData?.timerPausedAt && (
                  <div className="bg-yellow-500 text-black px-3 py-1 rounded font-bold text-sm animate-pulse mt-1">
                    ⏸ PAUSE
                  </div>
                )}
              </div>
            </div>

            {/* Current Blinds */}
            {currentBlindLevel && !currentBlindLevel.isBreak ? (
              <div className="mt-2 text-center">
                <div className="text-white/60 text-xs">Blinds</div>
                <div className="text-2xl font-black text-white">
                  {currentBlindLevel.smallBlind.toLocaleString()} / {currentBlindLevel.bigBlind.toLocaleString()}
                  {currentBlindLevel.ante > 0 && (
                    <span className="text-lg ml-2" style={{ color: currentTheme.colors.primaryLight }}>
                      (A: {currentBlindLevel.ante.toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            ) : currentBlindLevel && currentBlindLevel.isBreak ? (
              <div className="mt-2 text-center">
                <div className="text-2xl font-black text-blue-300">☕ PAUSE</div>
              </div>
            ) : null}

            {/* Next Blinds */}
            {nextBlindLevel && !nextBlindLevel.isBreak && (
              <div className="mt-1 text-center">
                <span className="text-white/60 text-xs">Suivant: </span>
                <span className="text-base font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                  {nextBlindLevel.smallBlind.toLocaleString()} / {nextBlindLevel.bigBlind.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Right Section - Stats */}
          <div className="w-40 flex flex-col justify-center gap-2 px-3 py-2 border-l" style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.backgroundDark }}>
            {/* Round */}
            {currentBlindLevel && !currentBlindLevel.isBreak && (
              <div className="text-center">
                <div className="text-xs text-white/60">Round</div>
                <div className="text-xl font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                  {currentBlindLevel.level}
                </div>
              </div>
            )}

            {/* Players */}
            <div className="text-center">
              <div className="text-xs text-white/60">Joueurs</div>
              <div className="text-xl font-black text-white">
                {activePlayers.length}<span className="text-sm text-white/60">/{results.length}</span>
              </div>
            </div>

            {/* Average Stack */}
            <div className="text-center">
              <div className="text-xs text-white/60">Tapis moy.</div>
              <div className="text-lg font-bold text-white">{averageStack > 0 ? averageStack.toLocaleString() : '0'}</div>
              {currentBlindLevel && averageStack > 0 && (
                <div className="text-xs" style={{ color: currentTheme.colors.primaryLight }}>
                  {Math.floor(averageStack / currentBlindLevel.bigBlind)} BB
                </div>
              )}
            </div>

            {/* Prize Pool */}
            <div className="text-center">
              <div className="text-xs text-white/60">Pot</div>
              <div className="text-lg font-bold text-white">{calculatedPrizePool.toFixed(0)}€</div>
            </div>
          </div>

          {/* Reassign Tables Indicator */}
          {currentBlindLevel?.rebalanceTables && (
            <div className="absolute top-0 left-0 right-0 bg-orange-500/20 border-b-2 border-orange-400 py-1 px-3 text-center animate-pulse">
              <div className="text-xs font-bold text-orange-300 flex items-center justify-center gap-2">
                <LayoutGrid className="h-3 w-3" />
                Réassignation des tables
              </div>
            </div>
          )}

          {/* Bouton Play/Pause - toujours visible, l'API vérifie les permissions */}
          {tournament.status === 'IN_PROGRESS' && (
            <button
              onPointerDown={(e) => {
                // Use pointerdown for unified touch/mouse handling
                e.preventDefault();
                e.stopPropagation();
                console.log('[Timer] Mobile landscape button: pointerdown');
                handleToggleTimer(e as unknown as React.MouseEvent);
              }}
              style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent', backgroundColor: serverTimerData?.timerPausedAt ? '#22c55e' : '#ef4444' }}
              className="fixed bottom-2 right-2 z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center select-none"
            >
              {isTogglingTimer ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : serverTimerData?.timerPausedAt ? (
                <Play className="h-7 w-7 text-white ml-0.5" />
              ) : (
                <Pause className="h-7 w-7 text-white" />
              )}
            </button>
          )}

          {/* Timer Toast Notification */}
          {timerToast && (
            <div
              className={`fixed bottom-16 left-2 z-50 px-3 py-1.5 rounded-lg shadow-lg text-white text-xs font-medium animate-in fade-in slide-in-from-bottom-2 ${
                timerToast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              {timerToast.message}
            </div>
          )}
        </div>
      ) : (
      <div className="flex h-[calc(100vh-80px)]">
        {/* LEFT PANEL - Hidden in fullscreen mode */}
        {!isFullscreen && (
        <div className="w-1/5 bg-[hsl(220,15%,18%)] p-6 flex flex-col border-r-2 border-[hsl(220,13%,30%)]">
          <div className="space-y-6">
            {/* Current Time */}
            <div className="text-center">
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

          {/* Championship Leaderboard (Top 3) - At bottom of left panel */}
          {leaderboardData && leaderboardData.leaderboard.length > 0 && (
            <div className="mt-auto pt-6 border-t border-[hsl(220,13%,30%)]">
              <div className="text-white/80 text-lg font-semibold mb-3 text-center flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5" style={{ color: currentTheme.colors.primary }} />
                Classement Championnat
              </div>
              <div className="space-y-2">
                {leaderboardData.leaderboard.slice(0, 3).map((player, index) => (
                  <div
                    key={player.player.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ backgroundColor: currentTheme.colors.backgroundDark }}
                  >
                    <span className="text-2xl">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-lg truncate">
                        {player.player.nickname || `${player.player.firstName} ${player.player.lastName.charAt(0)}.`}
                      </div>
                    </div>
                    <div className="text-2xl font-black" style={{ color: currentTheme.colors.primary }}>
                      {player.totalPoints}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowTablesPlan(false);
                  setShowChipsModal(false);
                  setShowLeaderboardModal(true);
                }}
                className="w-full text-center text-sm font-semibold py-2 mt-2 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: currentTheme.colors.primaryLight }}
              >
                Voir le classement complet
              </button>
            </div>
          )}
        </div>
        )}

        {/* CENTER PANEL */}
        <div className="flex-1 p-8 flex flex-col justify-center space-y-6" style={{ backgroundColor: currentTheme.colors.background }}>
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
            <div className="border-2 rounded-xl py-4 px-6 text-center" style={{
              backgroundColor: currentTheme.colors.backgroundLight,
              borderColor: currentTheme.colors.border
            }}>
              <div className="text-4xl font-bold" style={{ color: currentTheme.colors.primaryLight }}>
                Prochaines Blinds : {nextBlindLevel.smallBlind.toLocaleString()} / {nextBlindLevel.bigBlind.toLocaleString()}
                {nextBlindLevel.ante > 0 && ` (${nextBlindLevel.ante.toLocaleString()})`}
              </div>
            </div>
          )}

          {/* Next break info */}
          {timeUntilBreak !== null && nextBreak && (
            <div className="bg-blue-500/10 border-2 border-blue-400/50 rounded-xl py-4 px-6 text-center">
              <div className="text-2xl font-bold text-blue-300">
                Prochain break dans : {formatTimeWithHours(timeUntilBreak)}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Hidden in fullscreen mode */}
        {!isFullscreen && (
        <div className="w-1/5 bg-[hsl(220,15%,18%)] p-6 flex flex-col border-l-2 border-[hsl(220,13%,30%)]">
          <div className="space-y-6">
            {/* Prize Pool */}
            <div className="text-center">
              <div className="text-white/80 text-lg font-semibold mb-2 italic">Pot Total :</div>
              <div className="text-5xl font-black text-white drop-shadow-lg">
                {calculatedPrizePool.toFixed(0)} €
              </div>
            </div>

            {/* Top Sharks */}
            {topSharks.length > 0 && (
              <div className="border-2 border-red-500 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4 justify-center">
                  <span className="text-3xl">🦈</span>
                  <h3 className="text-xl font-bold text-red-400 uppercase tracking-wide">Top Sharks</h3>
                </div>
                <div className="space-y-3">
                  {topSharks.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="text-white font-bold text-xl flex-1 truncate">
                        {player.player.nickname || `${player.player.firstName} ${player.player.lastName.charAt(0)}.`}
                      </span>
                      <span className="text-red-400 font-black text-2xl">
                        {player.eliminationsCount} 💀
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Rebuyers */}
            {topRebuyers.length > 0 && (
              <div className="border-2 border-yellow-500 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-4 justify-center">
                  <span className="text-3xl">💸</span>
                  <h3 className="text-xl font-bold text-yellow-400 uppercase tracking-wide">Top Recavers</h3>
                </div>
                <div className="space-y-3">
                  {topRebuyers.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3">
                      <span className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="text-white font-bold text-xl flex-1 truncate">
                        {player.player.nickname || `${player.player.firstName} ${player.player.lastName.charAt(0)}.`}
                      </span>
                      <span className="text-yellow-400 font-black text-2xl">
                        {player.rebuysCount} 🔄
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chip Denominations Button - At bottom */}
          {chips.length > 0 && (
            <button
              onClick={() => {
                setShowTablesPlan(false);
                setShowLeaderboardModal(false);
                setShowChipsModal(true);
              }}
              className="mt-auto pt-4 w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 transition-all hover:opacity-90"
              style={{
                backgroundColor: currentTheme.colors.backgroundDark,
                borderColor: currentTheme.colors.border,
              }}
            >
              <Coins className="h-8 w-8" style={{ color: currentTheme.colors.primary }} />
              <span className="text-2xl font-bold text-white">Voir les jetons</span>
            </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {tablesPlanData.tables.map((table) => (
                      <div
                        key={table.tableNumber}
                        className="rounded-2xl p-6 border-3"
                        style={{
                          backgroundColor: currentTheme.colors.backgroundLight,
                          borderColor: currentTheme.colors.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-4xl font-black" style={{ color: currentTheme.colors.primary }}>
                            Table {table.tableNumber}
                          </h3>
                          <span className="text-2xl text-white/60 font-bold">
                            {table.activeCount}/{table.totalCount}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {table.seats.map((seat, idx) => (
                            <div
                              key={seat.playerId}
                              className={`flex items-center justify-between gap-6 py-4 px-6 rounded-xl ${
                                seat.isEliminated ? 'opacity-40' : ''
                              }`}
                              style={{
                                backgroundColor: seat.isEliminated
                                  ? 'rgba(255,255,255,0.3)'
                                  : 'rgba(255,255,255,0.9)',
                              }}
                            >
                              <span className="text-slate-500 text-2xl font-bold whitespace-nowrap">
                                S{seat.seatNumber ?? idx + 1}
                              </span>
                              <span className={`text-slate-900 font-black text-4xl uppercase truncate ${
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

      {/* Chips Modal */}
      {showChipsModal && chips.length > 0 && (
        <div className="fixed inset-0 z-[9998] bg-black/85 flex items-center justify-center p-4">
          <div
            className="w-[60vw] max-w-[700px] overflow-hidden rounded-3xl p-8 flex flex-col"
            style={{ backgroundColor: currentTheme.colors.backgroundDark }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <h2 className="text-4xl font-bold text-white flex items-center gap-4">
                <Coins className="h-10 w-10" style={{ color: currentTheme.colors.primary }} />
                Valeur des Jetons
              </h2>
              <button
                onClick={() => setShowChipsModal(false)}
                className="text-white/60 hover:text-white text-4xl font-bold w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Chips Grid */}
            <div className="grid grid-cols-2 gap-6">
              {chips.map((chip) => (
                <div
                  key={chip.id}
                  className="flex items-center gap-6 p-4 rounded-2xl"
                  style={{ backgroundColor: currentTheme.colors.backgroundLight }}
                >
                  <div
                    className="w-20 h-20 rounded-full border-4 border-white shadow-xl flex items-center justify-center font-bold text-2xl flex-shrink-0"
                    style={{
                      backgroundColor: chip.color,
                      color: getTextColor(chip.color),
                    }}
                  >
                    {chip.value >= 1000 ? `${chip.value / 1000}K` : chip.value}
                  </div>
                  <div className="text-5xl font-black text-white drop-shadow-lg">
                    {chip.value.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Championship Leaderboard Modal */}
      {showLeaderboardModal && leaderboardData && (
        <div className="fixed inset-0 z-[9998] bg-black/85 flex items-center justify-center p-4">
          <div
            className="w-[80vw] max-w-[1000px] max-h-[90vh] overflow-hidden rounded-3xl p-8 flex flex-col"
            style={{ backgroundColor: currentTheme.colors.backgroundDark }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8 flex-shrink-0">
              <h2 className="text-4xl font-bold text-white flex items-center gap-4">
                <Trophy className="h-10 w-10" style={{ color: currentTheme.colors.primary }} />
                Classement Championnat {leaderboardData.season.year}
              </h2>
              <button
                onClick={() => setShowLeaderboardModal(false)}
                className="text-white/60 hover:text-white text-4xl font-bold w-12 h-12 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Season Info */}
            <div className="text-center mb-6 text-white/60">
              <span className="text-lg">
                {leaderboardData.season.completedTournamentsCount} tournoi{leaderboardData.season.completedTournamentsCount > 1 ? 's' : ''} joué{leaderboardData.season.completedTournamentsCount > 1 ? 's' : ''}
                {leaderboardData.season.totalTournamentsCount && ` / ${leaderboardData.season.totalTournamentsCount}`}
              </span>
              {leaderboardData.season.bestTournamentsCount && (
                <span className="ml-4 text-lg">
                  (Top {leaderboardData.season.bestTournamentsCount} comptabilisés)
                </span>
              )}
            </div>

            {/* Leaderboard Table */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {leaderboardData.leaderboard.map((player, index) => (
                  <div
                    key={player.player.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl ${
                      index < 3 ? 'border-2' : ''
                    }`}
                    style={{
                      backgroundColor: currentTheme.colors.backgroundLight,
                      borderColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'transparent',
                    }}
                  >
                    {/* Rank */}
                    <div className="w-16 flex-shrink-0 text-center">
                      {index < 3 ? (
                        <span className="text-4xl">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-3xl font-bold text-white/60">#{player.rank}</span>
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl font-bold text-white truncate">
                        {player.player.nickname || `${player.player.firstName} ${player.player.lastName}`}
                      </div>
                      <div className="text-sm text-white/50 flex gap-4 mt-1">
                        <span>{player.tournamentsPlayed} tournoi{player.tournamentsPlayed > 1 ? 's' : ''}</span>
                        {player.victories > 0 && (
                          <span className="text-yellow-400">{player.victories} victoire{player.victories > 1 ? 's' : ''}</span>
                        )}
                        {player.podiums > 0 && (
                          <span className="text-orange-400">{player.podiums} podium{player.podiums > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-4xl font-black" style={{ color: currentTheme.colors.primary }}>
                        {player.totalPoints}
                      </div>
                      <div className="text-sm text-white/50">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time (temps de réflexion) Overlay */}
      {timeState && (
        <div className="fixed top-4 right-4 md:top-8 md:right-8 z-[9999]">
          <div
            className={`
              flex flex-col items-center justify-center
              px-6 py-4 md:px-10 md:py-6
              rounded-2xl md:rounded-3xl
              shadow-2xl
              border-4
              ${timeState.remainingSeconds <= 5 && timeState.remainingSeconds > 0 ? 'animate-pulse' : ''}
            `}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              borderColor: timeState.remainingSeconds <= 5 ? '#ef4444' : '#f59e0b',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <Timer
                className={`h-6 w-6 md:h-10 md:w-10 ${
                  timeState.remainingSeconds <= 5 ? 'text-red-500' : 'text-amber-500'
                }`}
              />
              <span
                className={`text-xl md:text-3xl font-black uppercase tracking-wider ${
                  timeState.remainingSeconds <= 5 ? 'text-red-500' : 'text-amber-500'
                }`}
              >
                TIME
              </span>
            </div>

            {/* Countdown */}
            <div
              className={`
                text-5xl md:text-8xl font-black leading-none
                ${timeState.remainingSeconds <= 5 && timeState.remainingSeconds > 0 ? 'text-red-500 scale-110' : 'text-white'}
                ${timeState.remainingSeconds === 0 ? 'text-red-500' : ''}
                transition-all duration-200
              `}
            >
              {timeState.remainingSeconds === 0 ? (
                <span className="text-3xl md:text-5xl">TERMINÉ</span>
              ) : (
                `0:${timeState.remainingSeconds.toString().padStart(2, '0')}`
              )}
            </div>

            {/* Progress bar */}
            {timeState.remainingSeconds > 0 && (
              <div className="w-full mt-3 md:mt-4 h-2 md:h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 rounded-full ${
                    timeState.remainingSeconds <= 5 ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${(timeState.remainingSeconds / timeState.totalSeconds) * 100}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Elimination Notification Overlay */}
      {eliminationNotification && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
          <div
            className={`
              flex flex-col items-center justify-center
              px-8 py-6 md:px-16 md:py-10
              rounded-3xl
              shadow-2xl
              border-4
              animate-in zoom-in-95 fade-in duration-300
              max-w-[90vw] md:max-w-[70vw]
            `}
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              borderColor: eliminationNotification.type === 'elimination' ? '#ef4444' : '#f59e0b',
            }}
          >
            {/* Header Icon */}
            <div className="mb-4 md:mb-6">
              {eliminationNotification.type === 'elimination' ? (
                <Skull className="h-16 w-16 md:h-24 md:w-24 text-red-500 animate-pulse" />
              ) : (
                <RefreshCw className="h-16 w-16 md:h-24 md:w-24 text-amber-500" />
              )}
            </div>

            {/* Title */}
            <div className={`text-2xl md:text-4xl font-black uppercase tracking-wider mb-4 md:mb-6 ${
              eliminationNotification.type === 'elimination' ? 'text-red-500' : 'text-amber-500'
            }`}>
              {eliminationNotification.type === 'elimination' ? 'ÉLIMINATION' : 'PERTE DE TAPIS'}
            </div>

            {/* Eliminated Player */}
            <div className="text-center mb-4 md:mb-6">
              <div className="text-white/60 text-lg md:text-xl mb-2">
                {eliminationNotification.type === 'elimination' ? 'Éliminé' : 'Bust'}
              </div>
              <div className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">
                {eliminationNotification.eliminatedName}
              </div>
              {eliminationNotification.rank && (
                <div className="text-xl md:text-2xl text-white/80 mt-2">
                  #{eliminationNotification.rank}
                  {eliminationNotification.rank <= 3 && (
                    <span className="ml-2">
                      {eliminationNotification.rank === 1 ? '🥇' : eliminationNotification.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Eliminator */}
            <div className="text-center">
              <div className="text-white/60 text-lg md:text-xl mb-2">par</div>
              <div className="text-3xl md:text-5xl font-black text-red-400 drop-shadow-lg flex items-center justify-center gap-3">
                <span>🦈</span>
                {eliminationNotification.eliminatorName}
                <span>🦈</span>
              </div>
            </div>

            {/* Leader Kill Badge */}
            {eliminationNotification.isLeaderKill && (
              <div className="mt-4 md:mt-6 px-6 py-2 bg-yellow-500/20 border-2 border-yellow-500 rounded-xl">
                <div className="text-yellow-400 text-xl md:text-2xl font-bold flex items-center gap-2">
                  <Trophy className="h-6 w-6 md:h-8 md:w-8" />
                  LEADER KILL
                  <Trophy className="h-6 w-6 md:h-8 md:w-8" />
                </div>
              </div>
            )}

            {/* Rebuy Indication for Bust */}
            {eliminationNotification.type === 'bust' && (
              <div className="mt-4 md:mt-6 text-amber-400 text-lg md:text-xl font-medium">
                Recave possible
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Right - Tables Plan Toggle - Responsive position */}
      <div className="fixed bottom-2 right-2 md:bottom-4 md:right-4 z-[9999] space-y-3">
        {/* Tables Plan Toggle */}
        <button
          onClick={handleToggleTablesPlan}
          className={`flex items-center gap-1 md:gap-2 text-white font-bold text-sm md:text-lg px-3 py-2 md:px-5 md:py-4 rounded-lg md:rounded-xl shadow-2xl transition-all ${
            showTablesPlan ? 'ring-2 ring-offset-2 ring-offset-transparent' : ''
          }`}
          style={{
            backgroundColor: showTablesPlan ? currentTheme.colors.primary : 'hsl(220,15%,18%)',
            borderColor: currentTheme.colors.primary,
            borderWidth: '2px',
            borderStyle: 'solid',
          }}
        >
          <LayoutGrid className="h-4 w-4 md:h-6 md:w-6" />
          <span className="hidden sm:inline">{showTablesPlan ? 'Masquer Tables' : 'Plan des Tables'}</span>
          <span className="sm:hidden">{showTablesPlan ? 'Masquer' : 'Tables'}</span>
        </button>
      </div>

    </div>
  );
}
