'use client';

import React from 'react';

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
  const maxBarHeight = 580; // Hauteur maximale disponible en pixels

  // Check if any player has leader kills > 0
  const hasLeaderKills = topPlayers.some((p) => p.leaderKills && p.leaderKills > 0);

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

      {/* Header avec titre PLUS GROS */}
      <div className="absolute top-6 left-0 right-0 h-32 flex items-center justify-center px-8 z-10">
        <div className="text-center">
          <h1
            className="text-8xl font-black text-yellow-400 mb-2 tracking-tight"
            style={{ textShadow: '0 0 30px rgba(234, 179, 8, 0.6), 0 4px 8px rgba(0,0,0,0.5)' }}
          >
            🦈 TOP SHARKS 🦈
          </h1>
          <p className="text-3xl text-gray-300 font-semibold">{seasonName} - Les Tueurs</p>
        </div>
      </div>

      {/* Graphique en barres */}
      <div className="absolute top-44 left-4 right-4 bottom-6 z-10">
        {/* Zone des barres avec ligne de base commune */}
        <div className="relative w-full h-[calc(100%-140px)] flex items-end justify-around gap-1">
          {topPlayers.map((player, index) => {
            // Calcul de la hauteur en pixels (proportionnel aux kills)
            const barHeightPx = player.totalEliminations > 0
              ? Math.max((player.totalEliminations / maxKills) * maxBarHeight, 40)
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
                {/* Nombre d'éliminations - GROS et ROUGE */}
                <div className="mb-3 flex flex-col items-center">
                  <div
                    className="text-4xl font-black"
                    style={{
                      color: isTop3 ? '#ef4444' : '#f87171',
                      textShadow: '0 0 15px rgba(239, 68, 68, 0.8), 0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    {player.totalEliminations}
                  </div>
                  {/* Leader Kills - seulement si > 0 et si quelqu'un en a */}
                  {hasLeaderKills && player.leaderKills && player.leaderKills > 0 && (
                    <div className="text-lg text-yellow-400 font-bold mt-1">
                      👑 {player.leaderKills}
                    </div>
                  )}
                </div>

                {/* Barre */}
                <div
                  className={`w-full bg-gradient-to-b ${barColor} rounded-t-lg relative transition-all duration-500 shadow-lg`}
                  style={{
                    height: `${barHeightPx}px`,
                    boxShadow: isTop3 ? '0 0 25px rgba(239, 68, 68, 0.7)' : 'none',
                  }}
                >
                  {/* Effet brillant */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 rounded-t-lg" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone fixe pour les noms en bas - PLUS GROS */}
        <div className="relative w-full h-[140px] flex justify-around gap-1 mt-4">
          {topPlayers.map((player, index) => {
            const isTop3 = index < 3;
            return (
              <div
                key={`name-${player.rank}`}
                className="flex items-start justify-center"
                style={{ width: `${100 / maxPlayers}%` }}
              >
                <div
                  className="font-bold text-center overflow-hidden"
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    maxWidth: '100%',
                    fontSize: isTop3 ? '20px' : '16px',
                    color: isTop3 ? '#fbbf24' : '#d1d5db',
                    textShadow: isTop3 ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none',
                  }}
                >
                  {player.nickname.length > 14
                    ? player.nickname.slice(0, 14) + '.'
                    : player.nickname}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer avec info */}
      <div className="absolute bottom-3 left-0 right-0 text-center z-10">
        <p className="text-gray-500 text-base">
          🦈 Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
