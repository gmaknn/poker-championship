'use client';

import React from 'react';

interface TournamentResult {
  tournamentId: string;
  tournamentNumber: number;
  points: number;
  rank?: number;
}

interface PlayerEvolution {
  rank: number;
  nickname: string;
  totalPoints: number;
  tournamentResults: TournamentResult[];
}

interface SeasonEvolutionChartProps {
  seasonName: string;
  players: PlayerEvolution[];
  tournamentCount: number;
}

/**
 * Get background color based on points value
 * Green for gains, red for losses, with gradients
 */
function getPointsColor(points: number): string {
  if (points === 0) {
    return '#f3f4f6'; // gray-100
  }

  if (points > 0) {
    // Green gradients for positive points
    if (points >= 500) return '#166534'; // green-800
    if (points >= 400) return '#15803d'; // green-700
    if (points >= 300) return '#16a34a'; // green-600
    if (points >= 200) return '#22c55e'; // green-500
    if (points >= 100) return '#4ade80'; // green-400
    return '#86efac'; // green-300
  }

  // Red gradients for negative points
  if (points <= -500) return '#991b1b'; // red-800
  if (points <= -400) return '#b91c1c'; // red-700
  if (points <= -300) return '#dc2626'; // red-600
  if (points <= -200) return '#ef4444'; // red-500
  if (points <= -100) return '#f87171'; // red-400
  return '#fca5a5'; // red-300
}

/**
 * Get text color based on background brightness
 */
function getTextColor(points: number): string {
  if (points === 0) return '#6b7280'; // gray-500
  if (Math.abs(points) >= 300) return '#ffffff';
  return '#1f2937'; // gray-800
}

export default function SeasonEvolutionChart({
  seasonName,
  players,
  tournamentCount,
}: SeasonEvolutionChartProps) {
  // Create array of tournament numbers [1, 2, 3, ..., tournamentCount]
  const tournamentNumbers = Array.from({ length: tournamentCount }, (_, i) => i + 1);

  return (
    <div
      id="season-evolution-chart"
      className="relative bg-white p-6"
      style={{
        minWidth: `${400 + tournamentCount * 80}px`,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{seasonName}</h1>
        <p className="text-lg text-gray-600">Evolution du classement - Points par journee</p>
      </div>

      {/* Main table */}
      <div className="overflow-x-auto">
        <table className="border-collapse border-2 border-gray-800 w-full">
          {/* Header */}
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold w-16">
                class
              </th>
              <th className="border-2 border-gray-800 px-4 py-2 text-left font-bold w-40">
                NOM
              </th>
              {tournamentNumbers.map((num) => (
                <th
                  key={num}
                  className="border-2 border-gray-800 px-2 py-2 text-center font-bold w-16"
                >
                  J{num}
                </th>
              ))}
              <th className="border-2 border-gray-800 px-3 py-2 text-center font-bold w-20">
                TOTAL
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {players.map((player, index) => {
              // Create a map of tournament results for quick lookup
              const resultsMap = new Map(
                player.tournamentResults.map((r) => [r.tournamentNumber, r])
              );

              const bgColor =
                player.rank === 1
                  ? 'bg-yellow-100'
                  : player.rank <= 3
                  ? 'bg-blue-50'
                  : index % 2 === 0
                  ? 'bg-gray-50'
                  : 'bg-white';

              return (
                <tr key={player.rank}>
                  {/* Rank */}
                  <td
                    className={`border-2 border-gray-800 px-3 py-2 text-center font-bold text-lg text-gray-900 ${bgColor}`}
                  >
                    {player.rank}
                  </td>

                  {/* Name */}
                  <td
                    className={`border-2 border-gray-800 px-4 py-2 font-semibold text-gray-800 truncate ${bgColor}`}
                  >
                    {player.nickname}
                  </td>

                  {/* Tournament results */}
                  {tournamentNumbers.map((num) => {
                    const result = resultsMap.get(num);
                    const points = result?.points ?? null;

                    if (points === null) {
                      // Player didn't participate
                      return (
                        <td
                          key={num}
                          className="border-2 border-gray-800 px-2 py-2 text-center text-gray-400"
                          style={{ backgroundColor: '#e5e7eb' }}
                        >
                          -
                        </td>
                      );
                    }

                    const bgColorCell = getPointsColor(points);
                    const textColor = getTextColor(points);

                    return (
                      <td
                        key={num}
                        className="border-2 border-gray-800 px-2 py-2 text-center font-semibold"
                        style={{
                          backgroundColor: bgColorCell,
                          color: textColor,
                        }}
                      >
                        {points > 0 ? `+${points}` : points}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td
                    className={`border-2 border-gray-800 px-3 py-2 text-center font-bold text-lg text-gray-900 ${bgColor}`}
                  >
                    {player.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-100 rounded border border-gray-300">
        <h3 className="font-bold text-gray-800 mb-3">Legende :</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400"
              style={{ backgroundColor: '#166534' }}
            />
            <span className="text-gray-700">500+ pts</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400"
              style={{ backgroundColor: '#22c55e' }}
            />
            <span className="text-gray-700">200-499 pts</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400"
              style={{ backgroundColor: '#86efac' }}
            />
            <span className="text-gray-700">1-199 pts</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400"
              style={{ backgroundColor: '#f3f4f6' }}
            />
            <span className="text-gray-700">0 pts</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400"
              style={{ backgroundColor: '#e5e7eb' }}
            />
            <span className="text-gray-700">Non participe</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400"
              style={{ backgroundColor: '#fca5a5' }}
            />
            <span className="text-gray-700">Negatif (penalite)</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-500 text-xs">
        Genere par Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
}
