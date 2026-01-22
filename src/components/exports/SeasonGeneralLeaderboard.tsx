'use client';

import { Trophy, Users } from 'lucide-react';
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

  return (
    <div className="bg-white p-6 min-w-[800px]">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Classement Général - {seasonName} {seasonYear}
        </h1>
        <p className="text-gray-600 mt-2">
          {tournamentsPlayed} tournoi{tournamentsPlayed > 1 ? 's' : ''} joué{tournamentsPlayed > 1 ? 's' : ''}
        </p>
      </div>

      {/* Podium Top 3 */}
      {top3.length >= 3 && (
        <div className="flex justify-center items-end gap-4 mb-8">
          {/* 2ème place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {isValidAvatarUrl(top3[1].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[1].avatar)!}
                  alt={top3[1].nickname}
                  className="w-20 h-20 rounded-full border-4 border-gray-400"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-gray-400 bg-gray-200 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-semibold text-gray-900">{top3[1].firstName} {top3[1].lastName}</p>
              <p className="text-sm text-gray-600">@{top3[1].nickname}</p>
              <p className="text-xl font-bold text-gray-700 mt-1">{top3[1].totalPoints} pts</p>
            </div>
            <div className="w-24 h-20 bg-gray-400 mt-2 rounded-t-lg" />
          </div>

          {/* 1ère place */}
          <div className="flex flex-col items-center">
            <Trophy className="w-10 h-10 text-yellow-500 mb-2" />
            <div className="relative">
              {isValidAvatarUrl(top3[0].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[0].avatar)!}
                  alt={top3[0].nickname}
                  className="w-24 h-24 rounded-full border-4 border-yellow-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-yellow-500 bg-gray-200 flex items-center justify-center">
                  <Users className="w-12 h-12 text-gray-500" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-bold text-lg text-gray-900">{top3[0].firstName} {top3[0].lastName}</p>
              <p className="text-sm text-gray-600">@{top3[0].nickname}</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{top3[0].totalPoints} pts</p>
            </div>
            <div className="w-28 h-28 bg-yellow-500 mt-2 rounded-t-lg" />
          </div>

          {/* 3ème place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {isValidAvatarUrl(top3[2].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[2].avatar)!}
                  alt={top3[2].nickname}
                  className="w-20 h-20 rounded-full border-4 border-orange-600"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-orange-600 bg-gray-200 flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
            </div>
            <div className="mt-3 text-center">
              <p className="font-semibold text-gray-900">{top3[2].firstName} {top3[2].lastName}</p>
              <p className="text-sm text-gray-600">@{top3[2].nickname}</p>
              <p className="text-xl font-bold text-orange-700 mt-1">{top3[2].totalPoints} pts</p>
            </div>
            <div className="w-24 h-16 bg-orange-600 mt-2 rounded-t-lg" />
          </div>
        </div>
      )}

      {/* Table complète */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rang</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Joueur</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Points</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Moyenne</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Tournois</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Victoires</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Podiums</th>
            </tr>
          </thead>
          <tbody>
            {rest.map((player, index) => (
              <tr
                key={player.playerId}
                className={`border-t border-gray-100 ${
                  player.rank <= 3 ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <td className="px-4 py-3">
                  <span
                    className={`font-bold ${
                      player.rank === 1
                        ? 'text-yellow-600'
                        : player.rank === 2
                        ? 'text-gray-500'
                        : player.rank === 3
                        ? 'text-orange-600'
                        : 'text-gray-700'
                    }`}
                  >
                    #{player.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {isValidAvatarUrl(player.avatar) ? (
                      <img
                        src={normalizeAvatarSrc(player.avatar)!}
                        alt={player.nickname}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-sm text-gray-500">@{player.nickname}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-lg text-gray-900">{player.totalPoints}</span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{player.averagePoints}</td>
                <td className="px-4 py-3 text-right text-gray-700">{player.tournamentsCount}</td>
                <td className="px-4 py-3 text-right text-gray-700">{player.victories}</td>
                <td className="px-4 py-3 text-right text-gray-700">{player.podiums}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
