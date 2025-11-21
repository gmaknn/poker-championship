'use client';

import React from 'react';
import Image from 'next/image';

// Helper function to check if avatar URL is valid
const isValidAvatarUrl = (url: string | null): boolean => {
  if (!url || url.trim() === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

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
  const maxBarHeight = 650; // Hauteur maximale disponible en pixels

  return (
    <div
      id="season-leaderboard-chart"
      className="relative w-[1600px] h-[1200px] bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8 pt-12 overflow-hidden"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Image de fond avec masque d'opacité */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/sharks-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.35,
        }}
      />

      {/* Dégradé d'overlay pour améliorer la lisibilité */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(17, 24, 39, 0.4) 0%, rgba(0, 0, 0, 0.3) 50%, rgba(17, 24, 39, 0.5) 100%)',
        }}
      />
      {/* Header avec titre */}
      <div className="absolute top-8 left-0 right-0 h-24 flex items-center justify-center px-8 z-10">
        {/* Titre */}
        <div className="text-center">
          <h1
            className="text-5xl font-bold text-yellow-400 mb-1"
            style={{ textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}
          >
            🦈 Top Sharks
          </h1>
          <p className="text-xl text-gray-400">{seasonName} - Les Tueurs</p>
        </div>
      </div>

      {/* Graphique en barres */}
      <div className="absolute top-36 left-4 right-4 bottom-6 z-10">
        {/* Zone des barres avec ligne de base commune */}
        <div className="relative w-full h-[calc(100%-100px)] flex items-end justify-around gap-1">
          {topPlayers.map((player, index) => {
            // Calcul de la hauteur en pixels (proportionnel aux kills)
            const barHeightPx = player.totalEliminations > 0
              ? Math.max((player.totalEliminations / maxKills) * maxBarHeight, 30)
              : 0;
            const isTop3 = index < 3;
            const barColors = [
              'from-red-500 to-red-700',       // 1er - Rouge sang
              'from-orange-500 to-orange-700', // 2ème - Orange
              'from-yellow-500 to-yellow-700', // 3ème - Jaune
            ];
            const barColor = isTop3 ? barColors[index] : 'from-gray-500 to-gray-700';

            return (
              <div
                key={player.rank}
                className="flex flex-col items-center"
                style={{ width: `${100 / maxPlayers}%` }}
              >
                {/* Avatar */}
                <div className="mb-3 relative">
                  {isValidAvatarUrl(player.avatar) && player.avatar ? (
                    <Image
                      src={player.avatar}
                      alt={player.nickname}
                      width={56}
                      height={56}
                      className="rounded-full border-3 border-red-500"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-700 border-3 border-red-500 flex items-center justify-center text-xl">
                      {player.nickname[0]?.toUpperCase()}
                    </div>
                  )}
                  {/* Badge du rang pour le top 3 */}
                  {isTop3 && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gray-900 border-2 border-red-500 flex items-center justify-center text-sm font-bold text-red-400">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Kills au-dessus de la barre */}
                <div className="mb-2 flex flex-col items-center">
                  <div className="text-lg font-bold text-red-400">
                    ⚔️ {player.totalEliminations}
                  </div>
                  {player.leaderKills && player.leaderKills > 0 && (
                    <div className="text-sm text-yellow-400">
                      👑 {player.leaderKills}
                    </div>
                  )}
                </div>

                {/* Barre */}
                <div
                  className={`w-full bg-gradient-to-b ${barColor} rounded-t-lg relative transition-all duration-500 shadow-lg`}
                  style={{
                    height: `${barHeightPx}px`,
                    boxShadow: isTop3 ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
                  }}
                >
                  {/* Effet brillant */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 rounded-t-lg" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone fixe pour les noms en bas */}
        <div className="relative w-full h-[100px] flex justify-around gap-1 mt-3">
          {topPlayers.map((player) => (
            <div
              key={`name-${player.rank}`}
              className="flex items-start justify-center"
              style={{ width: `${100 / maxPlayers}%` }}
            >
              <div
                className="text-sm text-gray-300 font-semibold text-center overflow-hidden"
                style={{
                  writingMode: maxPlayers > 15 ? 'vertical-rl' : 'horizontal-tb',
                  textOrientation: 'mixed',
                  maxWidth: '100%',
                }}
              >
                {player.nickname.length > 12
                  ? player.nickname.slice(0, 12) + '.'
                  : player.nickname}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer avec info */}
      <div className="absolute bottom-4 left-0 right-0 text-center z-10">
        <p className="text-gray-500 text-sm">
          🦈 Généré par Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
