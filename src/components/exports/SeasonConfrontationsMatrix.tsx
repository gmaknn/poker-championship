'use client';

import React from 'react';

interface Confrontation {
  eliminatorId: string;
  eliminatorNickname: string;
  eliminatedId: string;
  eliminatedNickname: string;
  count: number;
}

interface PlayerStats {
  id: string;
  nickname: string;
  totalKills: number;
  totalDeaths: number;
}

interface SeasonConfrontationsMatrixProps {
  seasonName: string;
  confrontations: Confrontation[];
  players: PlayerStats[];
}

/**
 * Get background color based on elimination count
 */
function getEliminationColor(count: number): string {
  if (count === 0) return '#f9fafb'; // gray-50
  if (count === 1) return '#fef3c7'; // amber-100
  if (count === 2) return '#fdba74'; // orange-300
  if (count >= 3) return '#f87171'; // red-400 (rivalry!)
  return '#f9fafb';
}

/**
 * Get text color based on background
 */
function getTextColor(count: number): string {
  if (count >= 3) return '#7f1d1d'; // red-900
  if (count >= 2) return '#9a3412'; // orange-800
  if (count >= 1) return '#92400e'; // amber-800
  return '#6b7280'; // gray-500
}

export default function SeasonConfrontationsMatrix({
  seasonName,
  confrontations,
  players,
}: SeasonConfrontationsMatrixProps) {
  // Sort players by total kills (descending), then by nickname
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
    return a.nickname.localeCompare(b.nickname);
  });

  // Create a lookup map for quick access to confrontation data
  const confrontationMap = new Map<string, number>();
  confrontations.forEach((c) => {
    const key = `${c.eliminatorId}-${c.eliminatedId}`;
    confrontationMap.set(key, c.count);
  });

  // Get elimination count between two players
  const getCount = (eliminatorId: string, eliminatedId: string): number => {
    return confrontationMap.get(`${eliminatorId}-${eliminatedId}`) || 0;
  };

  // Calculate max width needed
  const cellWidth = 40;
  const headerWidth = 120;
  const totalWidth = headerWidth + (sortedPlayers.length + 1) * cellWidth + 20;

  return (
    <div
      id="season-confrontations-matrix"
      className="relative bg-white p-6"
      style={{
        minWidth: `${Math.max(800, totalWidth)}px`,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{seasonName}</h1>
        <p className="text-lg text-gray-600">Confrontations directes - Qui elimine qui ?</p>
      </div>

      {/* Main table */}
      <div className="overflow-x-auto">
        <table className="border-collapse border-2 border-gray-800">
          {/* Header row with victim names */}
          <thead>
            <tr className="bg-gray-800 text-white">
              {/* Top-left corner cell */}
              <th
                className="border-2 border-gray-800 px-2 py-2 text-center font-bold"
                style={{ minWidth: `${headerWidth}px` }}
              >
                Eliminateur ↓ / Victime →
              </th>
              {/* Victim names (columns) */}
              {sortedPlayers.map((player) => (
                <th
                  key={player.id}
                  className="border-2 border-gray-800 px-1 py-2 text-center font-bold text-xs"
                  style={{
                    minWidth: `${cellWidth}px`,
                    maxWidth: `${cellWidth}px`,
                    writingMode: 'vertical-lr',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    height: '100px',
                  }}
                >
                  {player.nickname}
                </th>
              ))}
              {/* Total deaths column header */}
              <th
                className="border-2 border-gray-800 px-2 py-2 text-center font-bold bg-red-800 text-white text-xs"
                style={{
                  minWidth: `${cellWidth}px`,
                  writingMode: 'vertical-lr',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  height: '100px',
                }}
              >
                TOTAL KO
              </th>
            </tr>
          </thead>

          {/* Body rows */}
          <tbody>
            {sortedPlayers.map((eliminator, rowIndex) => (
              <tr key={eliminator.id}>
                {/* Eliminator name (row header) */}
                <td
                  className={`border-2 border-gray-800 px-2 py-1 font-semibold text-gray-800 truncate ${
                    rowIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                  }`}
                  style={{ maxWidth: `${headerWidth}px` }}
                >
                  {eliminator.nickname}
                </td>

                {/* Elimination cells */}
                {sortedPlayers.map((victim) => {
                  const isSelf = eliminator.id === victim.id;
                  const count = isSelf ? -1 : getCount(eliminator.id, victim.id);

                  if (isSelf) {
                    // Diagonal - player can't eliminate themselves
                    return (
                      <td
                        key={victim.id}
                        className="border-2 border-gray-800 px-1 py-1 text-center"
                        style={{
                          backgroundColor: '#d1d5db', // gray-300
                          minWidth: `${cellWidth}px`,
                        }}
                      >
                        -
                      </td>
                    );
                  }

                  const bgColor = getEliminationColor(count);
                  const textColor = getTextColor(count);

                  return (
                    <td
                      key={victim.id}
                      className="border-2 border-gray-800 px-1 py-1 text-center font-bold"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        minWidth: `${cellWidth}px`,
                      }}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  );
                })}

                {/* Total kills for this eliminator */}
                <td
                  className="border-2 border-gray-800 px-2 py-1 text-center font-bold bg-red-100 text-red-900"
                  style={{ minWidth: `${cellWidth}px` }}
                >
                  {eliminator.totalKills}
                </td>
              </tr>
            ))}

            {/* Total deaths row */}
            <tr className="bg-blue-800 text-white">
              <td className="border-2 border-gray-800 px-2 py-2 font-bold">TOTAL MORTS</td>
              {sortedPlayers.map((player) => (
                <td
                  key={player.id}
                  className="border-2 border-gray-800 px-1 py-2 text-center font-bold bg-blue-100 text-blue-900"
                  style={{ minWidth: `${cellWidth}px` }}
                >
                  {player.totalDeaths}
                </td>
              ))}
              {/* Empty corner cell */}
              <td
                className="border-2 border-gray-800 px-1 py-2 text-center bg-gray-400"
                style={{ minWidth: `${cellWidth}px` }}
              >
                -
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-100 rounded border border-gray-300">
        <h3 className="font-bold text-gray-800 mb-3">Legende :</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400 flex items-center justify-center text-xs"
              style={{ backgroundColor: '#f9fafb' }}
            >
              0
            </div>
            <span className="text-gray-700">Aucune elimination</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400 flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
            >
              1
            </div>
            <span className="text-gray-700">1 elimination</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400 flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: '#fdba74', color: '#9a3412' }}
            >
              2
            </div>
            <span className="text-gray-700">2 eliminations</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400 flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: '#f87171', color: '#7f1d1d' }}
            >
              3+
            </div>
            <span className="text-gray-700">3+ eliminations (rivalite !)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-gray-400 flex items-center justify-center text-xs"
              style={{ backgroundColor: '#d1d5db' }}
            >
              -
            </div>
            <span className="text-gray-700">Diagonale (soi-meme)</span>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <p>
            <strong>Lecture :</strong> Chaque cellule indique combien de fois le joueur de la ligne
            a elimine le joueur de la colonne.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-500 text-xs">
        Genere par Poker Championship Manager - {new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  );
}
