'use client';

import { useEffect, useState, use } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Trophy, Users, DollarSign, Clock } from 'lucide-react';
import { LegacyBanner } from '@/components/LegacyBanner';

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
};

type Tournament = {
  id: string;
  name: string | null;
  date: string;
  status: string;
  buyInAmount: number;
  lightRebuyAmount: number;
  prizePool: number | null;
  prizePoolAdjustment: number;
  currentLevel: number;
  levelStartedAt: string | null;
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

/**
 * Legacy TV View (v1) - Basic timer/blinds display
 *
 * This is a legacy version kept for backwards compatibility.
 * Use /tv/[tournamentId] for the canonical version.
 *
 * @see docs/TV_CANONICAL.md
 */
export default function TVSpectatorViewLegacy({
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [tournamentId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      calculateTimeRemaining();
    }, 1000);
    return () => clearInterval(timer);
  }, [resultsData]);

  const fetchData = async () => {
    try {
      const [resultsResponse, blindsResponse, chipsResponse] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/results`),
        fetch(`/api/tournaments/${tournamentId}/blinds`),
        fetch(`/api/tournaments/${tournamentId}/chips`),
      ]);

      if (resultsResponse.ok) {
        const data = await resultsResponse.json();
        setResultsData(data);
      }

      if (blindsResponse.ok) {
        const data = await blindsResponse.json();
        setBlindStructure(data.levels || []);
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
    if (!resultsData?.tournament.levelStartedAt) {
      setTimeRemaining(null);
      return;
    }

    const startTime = new Date(resultsData.tournament.levelStartedAt).getTime();
    const duration = resultsData.tournament.levelDuration * 60 * 1000;
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, duration - elapsed);
    setTimeRemaining(Math.floor(remaining / 1000));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!resultsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
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
  const levelsUntilBreak = nextBreak
    ? nextBreak.level - tournament.currentLevel
    : null;

  const rankedPlayers = results
    .filter((p) => p.finalRank !== null)
    .sort((a, b) => (a.finalRank || 999) - (b.finalRank || 999));
  const activePlayers = results.filter((p) => p.finalRank === null);
  const isCompleted = tournament.status === 'FINISHED';

  // Calculate average stack for active players
  const totalChipsInPlay = activePlayers.length > 0
    ? results.length * (tournament as any).startingChips
    : 0;
  const averageStack = activePlayers.length > 0
    ? Math.floor(totalChipsInPlay / activePlayers.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <LegacyBanner version="v1" canonicalPath={`/tv/${tournamentId}`} />
      <div className="max-w-7xl mx-auto space-y-8 pt-12">
        {/* Header avec heure actuelle */}
        <div className="flex items-start justify-between">
          <div className="text-center flex-1 space-y-2">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {tournament.name || 'Tournoi de Poker'}
            </h1>
            {season && (
              <p className="text-2xl text-slate-300">
                {season.name} {season.year}
              </p>
            )}
            <p className="text-xl text-slate-400">
              {format(new Date(tournament.date), "EEEE d MMMM yyyy 'à' HH'h'mm", {
                locale: fr,
              })}
            </p>
          </div>

          {/* Heure actuelle */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border-2 border-slate-700 min-w-[200px]">
            <div className="text-slate-400 text-sm uppercase tracking-wider mb-1">Heure</div>
            <div className="text-4xl font-bold text-white">
              {format(currentTime, 'HH:mm:ss')}
            </div>
          </div>
        </div>

        {/* Current Blind Level - OPTIMIZED FOR DISTANCE VIEWING */}
        {tournament.status === 'IN_PROGRESS' && currentBlindLevel && (
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur rounded-3xl p-12 border-4 border-yellow-500/50 shadow-2xl">
            <div className="grid grid-cols-3 gap-12">
              <div className="text-center">
                <div className="text-slate-300 text-3xl mb-4 font-semibold uppercase tracking-wider">Niveau Actuel</div>
                <div className="text-9xl font-black text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]">
                  {currentBlindLevel.isBreak ? 'PAUSE' : currentBlindLevel.level}
                </div>
                {!currentBlindLevel.isBreak && (
                  <div className="text-6xl mt-6 font-bold text-white drop-shadow-lg">
                    {currentBlindLevel.smallBlind} / {currentBlindLevel.bigBlind}
                    {currentBlindLevel.ante > 0 && ` (${currentBlindLevel.ante})`}
                  </div>
                )}
              </div>

              <div className="text-center">
                <div className="text-slate-300 text-3xl mb-4 font-semibold uppercase tracking-wider">
                  <Clock className="inline-block mr-3 h-8 w-8" />
                  Temps Restant
                </div>
                <div className={`text-9xl font-black drop-shadow-[0_0_30px_rgba(74,222,128,0.5)] ${
                  timeRemaining !== null && timeRemaining < 60
                    ? 'text-red-500 animate-pulse'
                    : timeRemaining !== null && timeRemaining < 120
                    ? 'text-orange-400'
                    : 'text-green-400'
                }`}>
                  {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                </div>
              </div>

              {nextBlindLevel && !nextBlindLevel.isBreak && (
                <div className="text-center">
                  <div className="text-slate-300 text-3xl mb-4 font-semibold uppercase tracking-wider">Prochain Niveau</div>
                  <div className="text-7xl font-black text-slate-200 drop-shadow-lg">
                    Niveau {nextBlindLevel.level}
                  </div>
                  <div className="text-5xl mt-4 font-bold text-slate-300">
                    {nextBlindLevel.smallBlind} / {nextBlindLevel.bigBlind}
                    {nextBlindLevel.ante > 0 && ` (${nextBlindLevel.ante})`}
                  </div>
                </div>
              )}
            </div>

            {/* Info prochain break */}
            {levelsUntilBreak && levelsUntilBreak > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-block bg-blue-500/20 border-2 border-blue-500/50 rounded-2xl px-8 py-4">
                  <div className="text-blue-300 text-2xl font-semibold">
                    ☕ Prochain break dans{' '}
                    <span className="text-blue-400 text-3xl font-bold">
                      {levelsUntilBreak}
                    </span>{' '}
                    niveau{levelsUntilBreak > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Tournament Stats */}
          <div className="col-span-9 grid grid-cols-5 gap-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-lg">Joueurs</div>
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-4xl font-bold">
                {isCompleted ? results.length : activePlayers.length}
              </div>
              <div className="text-slate-400 mt-1">
                {isCompleted ? 'Total' : `${rankedPlayers.length} éliminés`}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-lg">Average</div>
                <Trophy className="h-6 w-6 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400">
                {averageStack > 0 ? averageStack.toLocaleString() : '-'}
              </div>
              <div className="text-slate-400 mt-1 text-sm">
                {currentBlindLevel && averageStack > 0
                  ? `${Math.floor(averageStack / currentBlindLevel.bigBlind)} BB`
                  : 'Tapis moyen'}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-lg">Prize Pool</div>
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="text-4xl font-bold text-yellow-400">
                {(() => {
                  // Calculate prize pool if not set
                  if (tournament.prizePool) return `${tournament.prizePool}€`;
                  const totalStandardRebuys = results.reduce((sum, p) => sum + p.rebuysCount, 0);
                  const totalLightRebuys = results.filter(p => p.lightRebuyUsed).length;
                  const calculated = (results.length * tournament.buyInAmount) +
                    (totalStandardRebuys * tournament.buyInAmount) +
                    (totalLightRebuys * (tournament.lightRebuyAmount || 5)) +
                    (tournament.prizePoolAdjustment || 0);
                  return `${calculated}€`;
                })()}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-lg">Buy-in</div>
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div className="text-4xl font-bold text-green-400">
                {tournament.buyInAmount}€
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-lg">Recaves</div>
                <DollarSign className="h-6 w-6 text-orange-400" />
              </div>
              <div className="text-4xl font-bold text-orange-400">
                {results.reduce((sum, p) => sum + p.rebuysCount, 0)}
              </div>
            </div>
          </div>

          {/* Chip Denominations */}
          {chips.length > 0 && (
            <div className="col-span-3 bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="text-slate-300 text-xl font-semibold mb-4 uppercase tracking-wider">
                Jetons
              </div>
              <div className="space-y-3">
                {chips.slice(0, 8).map((chip) => (
                  <div key={chip.id} className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center font-bold text-sm"
                      style={{
                        backgroundColor: chip.color,
                        color: chip.value >= 500 ? '#000000' : '#FFFFFF',
                      }}
                    >
                      {chip.value >= 1000 ? `${chip.value / 1000}K` : chip.value}
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {chip.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rankings */}
        <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 border border-slate-700">
          <h2 className="text-4xl font-bold mb-6 text-center">
            {isCompleted ? 'Classement Final' : 'Joueurs Éliminés'}
          </h2>

          {rankedPlayers.length > 0 ? (
            <div className="space-y-4">
              {rankedPlayers.slice(0, 10).map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-6 rounded-2xl ${
                    player.finalRank === 1
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500'
                      : player.finalRank === 2
                      ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-2 border-gray-400'
                      : player.finalRank === 3
                      ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/20 border-2 border-orange-600'
                      : 'bg-slate-700/50 border border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      {player.finalRank === 1 && (
                        <Trophy className="h-12 w-12 text-yellow-400" />
                      )}
                      {player.finalRank === 2 && (
                        <Trophy className="h-10 w-10 text-gray-400" />
                      )}
                      {player.finalRank === 3 && (
                        <Trophy className="h-10 w-10 text-orange-600" />
                      )}
                      <span className="text-5xl font-bold text-slate-300">
                        #{player.finalRank}
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">
                        {player.player.firstName} {player.player.lastName}
                      </div>
                      <div className="text-xl text-slate-400">
                        {player.player.nickname}
                      </div>
                    </div>
                  </div>

                  {season && isCompleted && (
                    <div className="flex items-center gap-8 text-right">
                      {player.eliminationsCount > 0 && (
                        <div>
                          <div className="text-3xl font-bold text-red-400">
                            {player.eliminationsCount}
                          </div>
                          <div className="text-sm text-slate-400">Éliminations</div>
                        </div>
                      )}
                      {player.leaderKills > 0 && (
                        <div>
                          <div className="text-3xl font-bold text-yellow-400">
                            {player.leaderKills}
                          </div>
                          <div className="text-sm text-slate-400">Leader Kills</div>
                        </div>
                      )}
                      <div>
                        <div className="text-4xl font-bold text-green-400">
                          {player.totalPoints}
                        </div>
                        <div className="text-sm text-slate-400">Points</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-3xl text-slate-400 py-12">
              Le tournoi vient de commencer...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          Mise à jour automatique toutes les 5 secondes
        </div>
      </div>
    </div>
  );
}
