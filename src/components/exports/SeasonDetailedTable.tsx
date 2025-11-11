'use client';

import React from 'react';

interface TournamentResult {
  tournamentNumber: number;
  points: number; // Points gagnés/perdus lors de ce tournoi (peut être négatif)
  rank?: number;
}

interface PlayerDetail {
  rank: number;
  nickname: string;
  totalPoints: number;
  tournamentResults: TournamentResult[];
}

interface SeasonDetailedTableProps {
  seasonName: string;
  players: PlayerDetail[];
  tournamentCount: number;
}

export default function SeasonDetailedTable({
  seasonName,
  players,
  tournamentCount,
}: SeasonDetailedTableProps) {
  // Générer les numéros de tournois
  const tournamentNumbers = Array.from({ length: tournamentCount }, (_, i) => i + 1);

  return (
    <div
      id="season-detailed-table"
      className="relative w-[1400px] bg-white p-6"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{seasonName}</h1>
        <p className="text-lg text-gray-600">Détail par tournoi</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-gray-800">
          {/* Header row */}
          <thead>
            <tr className="bg-green-700">
              <th className="border-2 border-gray-800 px-3 py-2 text-white font-bold text-center w-16">
                class
              </th>
              {tournamentNumbers.map((num) => (
                <th
                  key={num}
                  className="border-2 border-gray-800 px-3 py-2 text-white font-bold text-center w-16"
                >
                  {num}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {players.map((player, playerIndex) => {
              // Couleur de fond alternée
              const bgColor = playerIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white';

              return (
                <tr key={player.rank} className={bgColor}>
                  {/* Colonne du nom avec rang */}
                  <td className="border-2 border-gray-800 px-3 py-2 font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{player.rank}</span>
                      <span className="truncate max-w-[120px]" title={player.nickname}>
                        {player.nickname}
                      </span>
                    </div>
                  </td>

                  {/* Colonnes des tournois */}
                  {tournamentNumbers.map((tournamentNum) => {
                    const result = player.tournamentResults.find(
                      (r) => r.tournamentNumber === tournamentNum
                    );

                    if (!result) {
                      // Pas participé à ce tournoi
                      return (
                        <td
                          key={tournamentNum}
                          className="border-2 border-gray-800 px-2 py-2 text-center bg-gray-200"
                        >
                          <span className="text-gray-400">-</span>
                        </td>
                      );
                    }

                    const points = result.points;
                    const isPositive = points > 0;
                    const isZero = points === 0;

                    // Couleur de fond selon le résultat
                    let cellBg = 'bg-white';
                    let textColor = 'text-gray-800';

                    if (isPositive) {
                      cellBg = 'bg-green-200';
                      textColor = 'text-green-800';
                    } else if (!isZero) {
                      cellBg = 'bg-red-200';
                      textColor = 'text-red-800';
                    }

                    return (
                      <td
                        key={tournamentNum}
                        className={`border-2 border-gray-800 px-2 py-2 text-center ${cellBg}`}
                      >
                        <span className={`font-semibold ${textColor}`}>
                          {points > 0 ? '+' : ''}
                          {points}
                        </span>
                        {result.rank && (
                          <div className="text-xs text-gray-600 mt-1">
                            #{result.rank}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-200 border border-gray-400"></div>
          <span className="text-gray-700">Gain de points</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-200 border border-gray-400"></div>
          <span className="text-gray-700">Perte de points</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 border border-gray-400"></div>
          <span className="text-gray-700">Non participé</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-500 text-xs">
        Généré par Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
}
