'use client';

import React from 'react';
import Image from 'next/image';

interface Player {
  rank: number;
  nickname: string;
  avatar: string | null;
  totalEliminations: number;
  leaderKills?: number;
  tournamentsPlayed?: number;
}

interface SeasonLeaderboardChartProps {
  seasonName: string;
  players: Player[];
  maxPlayers?: number;
}

export default function SeasonLeaderboardChart({
  seasonName,
  players,
  maxPlayers = 20,
}: SeasonLeaderboardChartProps) {
  const topPlayers = players.slice(0, maxPlayers);
  const maxKills = Math.max(...topPlayers.map((p) => p.totalEliminations), 1);

  return (
    <div
      id="season-leaderboard-chart"
      className="relative w-[1200px] h-[800px] bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header avec titre et avatars sharks */}
      <div className="absolute top-0 left-0 right-0 h-32 flex items-center justify-between px-8">
        {/* Avatar gauche */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50" />
          <div className="relative z-10 w-32 h-32 rounded-full bg-gray-800 border-4 border-yellow-400 flex items-center justify-center text-6xl">
            🦈
          </div>
          {/* Chapeau cowboy */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-6xl">
            🤠
          </div>
        </div>

        {/* Titre */}
        <div className="text-center">
          <h1
            className="text-6xl font-bold text-yellow-400 mb-2"
            style={{ textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}
          >
            🦈 Top Sharks
          </h1>
          <p className="text-2xl text-gray-400">{seasonName} - Les Tueurs</p>
        </div>

        {/* Avatar droit */}
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 bg-pink-400 rounded-full blur-xl opacity-50" />
          <div className="relative z-10 w-32 h-32 rounded-full bg-gray-800 border-4 border-pink-400 flex items-center justify-center text-6xl">
            🦈
          </div>
          {/* Accessoire */}
          <div className="absolute top-12 right-0 text-4xl">
            👔
          </div>
        </div>
      </div>

      {/* Graphique en barres */}
      <div className="absolute top-40 left-8 right-8 bottom-24">
        <div className="relative w-full h-full flex items-end justify-around gap-2">
          {topPlayers.map((player, index) => {
            const barHeight = (player.totalEliminations / maxKills) * 100;
            const isTop3 = index < 3;
            const barColors = [
              'from-red-500 to-red-700',       // 1er - Rouge sang
              'from-orange-500 to-orange-700', // 2ème - Orange
              'from-yellow-500 to-yellow-700', // 3ème - Jaune
            ];
            const barColor = isTop3 ? barColors[index] : 'from-gray-500 to-gray-700';
            const averageKills = player.tournamentsPlayed
              ? (player.totalEliminations / player.tournamentsPlayed).toFixed(1)
              : '0';

            return (
              <div
                key={player.rank}
                className="flex flex-col items-center"
                style={{ width: `${100 / maxPlayers}%` }}
              >
                {/* Avatar */}
                <div className="mb-2 relative">
                  {player.avatar ? (
                    <Image
                      src={player.avatar}
                      alt={player.nickname}
                      width={40}
                      height={40}
                      className="rounded-full border-2 border-red-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-red-500 flex items-center justify-center text-lg">
                      {player.nickname[0]?.toUpperCase()}
                    </div>
                  )}
                  {/* Badge du rang pour le top 3 */}
                  {isTop3 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 border-2 border-red-500 flex items-center justify-center text-xs font-bold text-red-400">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Kills au-dessus de la barre */}
                <div className="mb-1 flex flex-col items-center">
                  <div className="text-sm font-bold text-red-400">
                    ⚔️ {player.totalEliminations}
                  </div>
                  {player.leaderKills && player.leaderKills > 0 && (
                    <div className="text-xs text-yellow-400">
                      👑 {player.leaderKills}
                    </div>
                  )}
                </div>

                {/* Barre */}
                <div
                  className={`w-full bg-gradient-to-b ${barColor} rounded-t-lg relative transition-all duration-500 shadow-lg`}
                  style={{
                    height: `${barHeight}%`,
                    minHeight: '20px',
                    boxShadow: isTop3 ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
                  }}
                >
                  {/* Effet brillant */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 rounded-t-lg" />
                </div>

                {/* Nom du joueur (vertical ou horizontal selon l'espace) */}
                <div
                  className="mt-2 text-xs text-gray-300 font-semibold text-center overflow-hidden"
                  style={{
                    writingMode: maxPlayers > 15 ? 'vertical-rl' : 'horizontal-tb',
                    textOrientation: 'mixed',
                    maxWidth: '100%',
                  }}
                >
                  {player.nickname.length > 10
                    ? player.nickname.slice(0, 10) + '.'
                    : player.nickname}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer avec info */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-gray-500 text-sm">
          🦈 Généré par Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
