'use client';

import { Trophy, Users, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

type Player = {
  rank: number;
  playerId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  totalPoints: number;
  averagePoints: number;
  tournamentsCount: number;
  victories: number;
  podiums: number;
  rankChange?: number; // Positive = moved up, negative = moved down, undefined = new
};

type Props = {
  seasonName: string;
  seasonYear: number;
  players: Player[];
  tournamentsPlayed: number;
};

export default function SeasonGeneralLeaderboard({
  seasonName,
  seasonYear,
  players,
  tournamentsPlayed,
}: Props) {
  const top3 = players.slice(0, 3);
  const rest = players;

  // Render rank change indicator
  const RankChangeIndicator = ({ rankChange }: { rankChange?: number }) => {
    if (rankChange === undefined) {
      return <span className="text-sm font-bold text-blue-400 ml-2">NEW</span>;
    }
    if (rankChange > 0) {
      return (
        <span className="flex items-center text-sm font-bold text-green-400 ml-2">
          <TrendingUp className="w-4 h-4 mr-0.5" />+{rankChange}
        </span>
      );
    }
    if (rankChange < 0) {
      return (
        <span className="flex items-center text-sm font-bold text-red-400 ml-2">
          <TrendingDown className="w-4 h-4 mr-0.5" />{rankChange}
        </span>
      );
    }
    return (
      <span className="flex items-center text-sm font-bold text-gray-400 ml-2">
        <Minus className="w-4 h-4" />
      </span>
    );
  };

  return (
    <div style={{ backgroundColor: '#1a472a' }} className="p-8 min-w-[900px]">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white">
          Classement Général - {seasonName} {seasonYear}
        </h1>
        <p className="text-xl text-green-200 mt-2">
          {tournamentsPlayed} tournoi{tournamentsPlayed > 1 ? 's' : ''} joué{tournamentsPlayed > 1 ? 's' : ''}
        </p>
      </div>

      {/* Podium Top 3 */}
      {top3.length >= 3 && (
        <div className="flex justify-center items-end gap-6 mb-10">
          {/* 2ème place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {isValidAvatarUrl(top3[1].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[1].avatar)!}
                  alt={top3[1].nickname}
                  className="w-24 h-24 rounded-full border-4 border-gray-300"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-gray-300 bg-gray-700 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-800 font-bold text-xl">
                2
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-bold text-xl text-white">{top3[1].firstName} {top3[1].lastName}</p>
              <p className="text-lg text-green-200">@{top3[1].nickname}</p>
              <p className="text-2xl font-bold text-gray-300 mt-1">{top3[1].totalPoints} pts</p>
            </div>
            <div className="w-28 h-24 bg-gray-300 mt-3 rounded-t-lg" />
          </div>

          {/* 1ère place */}
          <div className="flex flex-col items-center">
            <Trophy className="w-14 h-14 text-yellow-400 mb-2" />
            <div className="relative">
              {isValidAvatarUrl(top3[0].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[0].avatar)!}
                  alt={top3[0].nickname}
                  className="w-28 h-28 rounded-full border-4 border-yellow-400"
                />
              ) : (
                <div className="w-28 h-28 rounded-full border-4 border-yellow-400 bg-gray-700 flex items-center justify-center">
                  <Users className="w-14 h-14 text-gray-400" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-bold text-2xl">
                1
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-bold text-2xl text-white">{top3[0].firstName} {top3[0].lastName}</p>
              <p className="text-lg text-green-200">@{top3[0].nickname}</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">{top3[0].totalPoints} pts</p>
            </div>
            <div className="w-32 h-32 bg-yellow-400 mt-3 rounded-t-lg" />
          </div>

          {/* 3ème place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {isValidAvatarUrl(top3[2].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[2].avatar)!}
                  alt={top3[2].nickname}
                  className="w-24 h-24 rounded-full border-4 border-orange-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-orange-500 bg-gray-700 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-bold text-xl text-white">{top3[2].firstName} {top3[2].lastName}</p>
              <p className="text-lg text-green-200">@{top3[2].nickname}</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">{top3[2].totalPoints} pts</p>
            </div>
            <div className="w-28 h-20 bg-orange-500 mt-3 rounded-t-lg" />
          </div>
        </div>
      )}

      {/* Zone Master indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Star className="w-6 h-6 text-yellow-400" />
        <span className="text-xl font-bold text-yellow-400">Zone Master (Top 10)</span>
        <Star className="w-6 h-6 text-yellow-400" />
      </div>

      {/* Table complète */}
      <div className="rounded-lg overflow-hidden border-2 border-green-700">
        <table className="w-full">
          <thead style={{ backgroundColor: '#0d3320' }}>
            <tr>
              <th className="px-5 py-4 text-left text-lg font-bold text-green-200">Rang</th>
              <th className="px-5 py-4 text-left text-lg font-bold text-green-200">Tendance</th>
              <th className="px-5 py-4 text-left text-lg font-bold text-green-200">Joueur</th>
              <th className="px-5 py-4 text-right text-lg font-bold text-green-200">Points</th>
              <th className="px-5 py-4 text-right text-lg font-bold text-green-200">Moyenne</th>
              <th className="px-5 py-4 text-right text-lg font-bold text-green-200">Tournois</th>
              <th className="px-5 py-4 text-right text-lg font-bold text-green-200">Victoires</th>
              <th className="px-5 py-4 text-right text-lg font-bold text-green-200">Podiums</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((player, index) => {
              const isTop10 = player.rank <= 10;
              const isTop3 = player.rank <= 3;
              const isSeparator = player.rank === 11;

              return (
                <>
                  {/* Separator line between Top 10 and rest */}
                  {isSeparator && (
                    <tr key="separator">
                      <td colSpan={8} className="h-1 bg-yellow-500" />
                    </tr>
                  )}
                  <tr
                    key={player.playerId}
                    style={{
                      backgroundColor: isTop3
                        ? 'rgba(234, 179, 8, 0.15)'
                        : isTop10
                        ? 'rgba(234, 179, 8, 0.08)'
                        : index % 2 === 0
                        ? '#1a472a'
                        : '#153d24',
                    }}
                  >
                    <td className="px-5 py-4">
                      <span
                        className={`font-bold text-xl ${
                          player.rank === 1
                            ? 'text-yellow-400'
                            : player.rank === 2
                            ? 'text-gray-300'
                            : player.rank === 3
                            ? 'text-orange-400'
                            : isTop10
                            ? 'text-yellow-200'
                            : 'text-white'
                        }`}
                      >
                        {player.rank}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <RankChangeIndicator rankChange={player.rankChange} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        {isValidAvatarUrl(player.avatar) ? (
                          <img
                            src={normalizeAvatarSrc(player.avatar)!}
                            alt={player.nickname}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                            <Users className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-lg text-white">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-base text-green-300">@{player.nickname}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-2xl text-yellow-300">{player.totalPoints}</span>
                    </td>
                    <td className="px-5 py-4 text-right text-lg text-green-100">{player.averagePoints}</td>
                    <td className="px-5 py-4 text-right text-lg text-green-100">{player.tournamentsCount}</td>
                    <td className="px-5 py-4 text-right text-lg text-green-100">{player.victories}</td>
                    <td className="px-5 py-4 text-right text-lg text-green-100">{player.podiums}</td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-center mt-6">
        <p className="text-green-300 text-lg">
          ⭐ Les 10 premiers disputent le Master de fin d'année ⭐
        </p>
      </div>
    </div>
  );
}
