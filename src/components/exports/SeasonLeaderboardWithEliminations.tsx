'use client';

import React from 'react';
import Image from 'next/image';

interface EliminationVictim {
  nickname: string;
  count: number;
}

interface PlayerRanking {
  rank: number;
  nickname: string;
  avatar: string | null;
  totalPoints: number;
  pointsChange: number; // Changement depuis le tournoi précédent
  placeDirect?: number; // Place si on faisait le tournoi maintenant
  victims: EliminationVictim[]; // Joueurs que ce joueur a éliminés
}

interface SeasonLeaderboardWithEliminationsProps {
  seasonName: string;
  players: PlayerRanking[];
}

export default function SeasonLeaderboardWithEliminations({
  seasonName,
  players,
}: SeasonLeaderboardWithEliminationsProps) {
  const maxVictims = Math.max(...players.map((p) => p.victims.length));
  const victimsColumnWidth = Math.max(200, maxVictims * 80);

  return (
    <div
      id="season-leaderboard-eliminations"
      className="relative bg-white p-6"
      style={{
        width: `${800 + victimsColumnWidth}px`,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{seasonName}</h1>
        <p className="text-lg text-gray-600">Classement avec Éliminations</p>
      </div>

      {/* Main table */}
      <div className="flex gap-4">
        {/* Left side: Ranking table */}
        <div className="flex-shrink-0">
          <table className="border-collapse border-2 border-gray-800">
            {/* Header */}
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold w-16">
                  TOP
                </th>
                <th className="border-2 border-gray-800 px-4 py-2 text-left font-bold w-40">
                  NOM
                </th>
                <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold w-24">
                  POINTS
                </th>
                <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold w-20">
                  gain
                </th>
                <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold w-24">
                  place direct<br />en pts
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {players.map((player, index) => {
                const bgColor =
                  player.rank === 1
                    ? 'bg-yellow-100'
                    : player.rank <= 3
                    ? 'bg-blue-50'
                    : index % 2 === 0
                    ? 'bg-gray-50'
                    : 'bg-white';

                const pointsChangeColor =
                  player.pointsChange > 0
                    ? 'text-green-600'
                    : player.pointsChange < 0
                    ? 'text-red-600'
                    : 'text-gray-600';

                return (
                  <tr key={player.rank} className={bgColor}>
                    {/* Rank */}
                    <td className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-lg">
                      {player.rank}
                    </td>

                    {/* Name with avatar */}
                    <td className="border-2 border-gray-800 px-4 py-2">
                      <div className="flex items-center gap-2">
                        {player.avatar ? (
                          <Image
                            src={player.avatar}
                            alt={player.nickname}
                            width={32}
                            height={32}
                            className="rounded-full border-2 border-gray-400"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-gray-400 flex items-center justify-center text-sm font-bold text-gray-600">
                            {player.nickname[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-gray-800 truncate">
                          {player.nickname}
                        </span>
                      </div>
                    </td>

                    {/* Total points */}
                    <td className="border-2 border-gray-800 px-3 py-2 text-center font-bold text-lg">
                      {player.totalPoints}
                    </td>

                    {/* Points change */}
                    <td className={`border-2 border-gray-800 px-3 py-2 text-center font-semibold ${pointsChangeColor}`}>
                      {player.pointsChange > 0 ? '+' : ''}
                      {player.pointsChange}
                    </td>

                    {/* Place direct */}
                    <td className="border-2 border-gray-800 px-3 py-2 text-center font-semibold text-gray-700">
                      {player.placeDirect ? `-${player.placeDirect}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right side: Arrows and victims */}
        <div className="flex-1 relative" style={{ minWidth: `${victimsColumnWidth}px` }}>
          {players.map((player, index) => {
            if (player.victims.length === 0) return null;

            // Calculate vertical position
            const rowHeight = 45; // Approximate height of each row
            const topPosition = 60 + index * rowHeight; // 60px for header

            return (
              <div
                key={player.rank}
                className="absolute flex items-center gap-2"
                style={{
                  top: `${topPosition}px`,
                  left: 0,
                }}
              >
                {/* Arrow */}
                <div className="text-2xl text-gray-400">→</div>

                {/* Victims */}
                <div className="flex flex-wrap gap-2 items-center">
                  {player.victims.map((victim, vIndex) => (
                    <div
                      key={vIndex}
                      className="px-2 py-1 bg-gray-800 text-white rounded text-sm font-semibold whitespace-nowrap"
                    >
                      {victim.nickname}
                      {victim.count > 1 && (
                        <span className="ml-1 text-red-400">x{victim.count}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-100 rounded border border-gray-300">
        <h3 className="font-bold text-gray-800 mb-2">Légende :</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            <span className="font-semibold">gain :</span> Changement de points depuis le dernier tournoi
          </li>
          <li>
            <span className="font-semibold">place direct en pts :</span> Points nécessaires pour accéder directement à la finale
          </li>
          <li>
            <span className="font-semibold">Victimes (→) :</span> Joueurs éliminés par ce joueur durant la saison
          </li>
          <li>
            <span className="text-red-400 font-semibold">xN :</span> Nombre d'éliminations du même joueur
          </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-500 text-xs">
        Généré par Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
}
