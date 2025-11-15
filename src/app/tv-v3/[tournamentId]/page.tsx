'use client';

import { useEffect, useState, use, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Trophy, Users, DollarSign, Clock } from 'lucide-react';
import { playCountdown, announceLevelChange, announceBreak } from '@/lib/audioManager';
import confetti from 'canvas-confetti';

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

export default function TVSpectatorViewV3({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = use(params);
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
  const previousLevelRef = useRef<number>(0);
  const confettiTriggeredRef = useRef(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [tournamentId]);

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
    }
  }, [resultsData?.tournament.status]);

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

  // Play countdown at 5 seconds
  useEffect(() => {
    if (timeRemaining === 5 && !countdownPlayedRef.current && serverTimerData?.timerStartedAt && !serverTimerData?.timerPausedAt) {
      countdownPlayedRef.current = true;
      playCountdown();
    }

    // Reset countdown flag when time remaining changes significantly
    if (timeRemaining !== null && timeRemaining > 10) {
      countdownPlayedRef.current = false;
    }
  }, [timeRemaining, serverTimerData]);

  // Announce level changes
  useEffect(() => {
    if (!resultsData?.tournament || !blindStructure) return;

    const currentLevel = resultsData.tournament.currentLevel;

    // Check if level has changed
    if (previousLevelRef.current !== 0 && previousLevelRef.current !== currentLevel) {
      const currentLevelData = blindStructure.find(level => level.level === currentLevel);

      if (currentLevelData) {
        if (currentLevelData.isBreak) {
          // Announce break
          announceBreak(currentLevelData.duration);
        } else {
          // Get active players for random selection
          const activePlayers = resultsData?.results.filter((p) => p.finalRank === null) || [];
          const playerNicknames = activePlayers.map(p => p.player.nickname || p.player.firstName);

          // Announce new level
          announceLevelChange(
            currentLevelData.level,
            currentLevelData.smallBlind,
            currentLevelData.bigBlind,
            currentLevelData.ante,
            playerNicknames
          );
        }
      }
    }

    // Update previous level
    previousLevelRef.current = currentLevel;
  }, [resultsData?.tournament.currentLevel, blindStructure]);

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
    <div className="min-h-screen bg-[hsl(220,18%,12%)] text-white overflow-hidden relative">
      {/* Header */}
      <div className="bg-[hsl(142,71%,45%)] py-4 px-8 border-b-4 border-[hsl(142,71%,35%)]">
        <h1 className="text-4xl font-bold text-center text-white drop-shadow-lg uppercase tracking-wider">
          {tournament.name || 'Tournoi de Poker'}
        </h1>
      </div>

      {/* Tournament Finished Screen */}
      {isCompleted && rankedPlayers.length > 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-80px)] bg-gradient-to-br from-[hsl(220,18%,12%)] to-[hsl(142,71%,15%)]">
          <div className="text-center space-y-12 p-12">
            <div className="text-9xl font-black text-[hsl(142,71%,45%)] drop-shadow-2xl uppercase tracking-wider animate-pulse">
              Terminé
            </div>

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
          </div>
        </div>
      ) : (
      <div className="flex h-[calc(100vh-80px)]">
        {/* LEFT PANEL */}
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

        {/* CENTER PANEL */}
        <div className="flex-1 bg-[hsl(220,18%,12%)] p-8 flex flex-col justify-center space-y-6">
          {/* Tournament Type */}
          <div className="bg-[hsl(220,15%,18%)] border-2 border-[hsl(220,13%,30%)] rounded-xl py-3 px-6 text-center">
            <div className="text-3xl font-bold text-white">{tournamentTypeLabel}</div>
          </div>

          {/* Current Round */}
          {currentBlindLevel && !currentBlindLevel.isBreak && (
            <div className="bg-[hsl(220,15%,18%)] border-2 border-[hsl(142,71%,45%)] rounded-xl py-3 px-6 text-center">
              <div className="text-3xl font-bold text-[hsl(142,71%,55%)]">Round : {currentBlindLevel.level}</div>
            </div>
          )}

          {/* Main Timer */}
          <div className="text-center relative">
            <div className={`text-[12rem] font-black leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] ${
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
              <div className="absolute top-0 right-0 bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold text-3xl animate-pulse shadow-lg">
                ⏸ PAUSE (Espace pour reprendre)
              </div>
            )}
          </div>

          {/* Current Blinds */}
          {currentBlindLevel && !currentBlindLevel.isBreak ? (
            <div className="bg-[hsl(220,15%,18%)] border-2 border-[hsl(142,71%,45%)] rounded-xl py-4 px-6 text-center">
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
            <div className="bg-[hsl(220,15%,18%)] border-2 border-[hsl(220,13%,30%)] rounded-xl py-4 px-6 text-center">
              <div className="text-3xl font-bold text-white/50">En attente du démarrage...</div>
            </div>
          )}

          {/* Next Blinds */}
          {nextBlindLevel && !nextBlindLevel.isBreak && (
            <div className="bg-[hsl(220,15%,22%)] border border-[hsl(220,13%,30%)] rounded-xl py-3 px-6 text-center">
              <div className="text-2xl font-bold text-[hsl(142,71%,60%)]">
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

        {/* RIGHT PANEL */}
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
                    {player.finalRank <= 3 && (
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
