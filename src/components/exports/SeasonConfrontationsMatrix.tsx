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
  seasonYear?: number;
  confrontations: Confrontation[];
  players: PlayerStats[];
}

/**
 * Get background color based on elimination count
 */
function getEliminationColor(count: number): string {
  if (count === 0) return 'rgba(71,85,105,0.2)'; // slate
  if (count === 1) return 'rgba(251,191,36,0.4)'; // amber
  if (count === 2) return 'rgba(249,115,22,0.5)'; // orange
  if (count >= 3) return 'rgba(239,68,68,0.6)'; // red (rivalry!)
  return 'rgba(71,85,105,0.2)';
}

/**
 * Get text color based on background
 */
function getTextColor(count: number): string {
  if (count >= 2) return '#ffffff';
  if (count >= 1) return '#fde047';
  return '#64748b';
}

export default function SeasonConfrontationsMatrix({
  seasonName,
  seasonYear,
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

  // Calculate width
  const cellWidth = 36;
  const headerWidth = 140;

  return (
    <div
      id="season-confrontations-matrix"
      style={{
        width: '100%',
        minWidth: `${headerWidth + (sortedPlayers.length + 1) * cellWidth + 100}px`,
        backgroundColor: '#0f172a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header - Fond vert poker */}
      <div style={{
        backgroundColor: '#1a472a',
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: '40px', top: '50%', transform: 'translateY(-50%)' }}>
          <img
            src="/images/logo-wpt.png"
            alt="WPT Villelaure"
            style={{ width: '80px', height: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 8px 0' }}>
            {seasonName}
          </h1>
          <p style={{ color: '#86efac', margin: '0', fontSize: '18px' }}>
            Confrontations directes - Qui elimine qui ?
          </p>
        </div>
        <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)' }}>
          <img
            src="/images/logo-wpt.png"
            alt="WPT Villelaure"
            style={{ width: '80px', height: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Contenu principal - Fond slate */}
      <div style={{ padding: '32px 40px', backgroundColor: '#0f172a' }}>
        {/* Matrix table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
            {/* Header row with victim names */}
            <thead>
              <tr style={{ backgroundColor: '#334155' }}>
                {/* Top-left corner cell */}
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #475569',
                    color: '#f8fafc',
                    fontSize: '11px',
                    fontWeight: '600',
                    minWidth: `${headerWidth}px`,
                  }}
                >
                  Eliminateur / Victime
                </th>
                {/* Victim names (columns) */}
                {sortedPlayers.map((player) => (
                  <th
                    key={player.id}
                    style={{
                      padding: '4px',
                      textAlign: 'center',
                      borderBottom: '2px solid #475569',
                      color: '#f8fafc',
                      fontSize: '10px',
                      fontWeight: '600',
                      minWidth: `${cellWidth}px`,
                      maxWidth: `${cellWidth}px`,
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      height: '90px',
                    }}
                  >
                    {player.nickname.length > 12 ? player.nickname.slice(0, 12) + '.' : player.nickname}
                  </th>
                ))}
                {/* Total kills column header */}
                <th
                  style={{
                    padding: '4px',
                    textAlign: 'center',
                    borderBottom: '2px solid #475569',
                    backgroundColor: 'rgba(239,68,68,0.25)',
                    color: '#fca5a5',
                    fontSize: '10px',
                    fontWeight: '600',
                    minWidth: `${cellWidth}px`,
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    height: '90px',
                  }}
                >
                  TOTAL KO
                </th>
              </tr>
            </thead>

            {/* Body rows */}
            <tbody>
              {sortedPlayers.map((eliminator, rowIndex) => {
                const bgColor = rowIndex % 2 === 0 ? '#1e293b' : '#273449';

                return (
                  <tr key={eliminator.id} style={{ backgroundColor: bgColor }}>
                    {/* Eliminator name (row header) */}
                    <td
                      style={{
                        padding: '6px 12px',
                        fontWeight: '500',
                        color: '#f8fafc',
                        fontSize: '13px',
                        maxWidth: `${headerWidth}px`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        borderBottom: '1px solid #475569',
                      }}
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
                            style={{
                              padding: '4px',
                              textAlign: 'center',
                              backgroundColor: 'rgba(71,85,105,0.4)',
                              color: '#64748b',
                              fontSize: '12px',
                              minWidth: `${cellWidth}px`,
                              borderBottom: '1px solid #475569',
                            }}
                          >
                            -
                          </td>
                        );
                      }

                      const cellBg = getEliminationColor(count);
                      const textColor = getTextColor(count);

                      return (
                        <td
                          key={victim.id}
                          style={{
                            padding: '4px',
                            textAlign: 'center',
                            backgroundColor: cellBg,
                            color: textColor,
                            fontSize: '13px',
                            fontWeight: count > 0 ? 'bold' : 'normal',
                            minWidth: `${cellWidth}px`,
                            borderBottom: '1px solid #475569',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}

                    {/* Total kills for this eliminator */}
                    <td
                      style={{
                        padding: '6px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(239,68,68,0.15)',
                        color: '#fca5a5',
                        fontSize: '14px',
                        minWidth: `${cellWidth}px`,
                        borderBottom: '1px solid #475569',
                      }}
                    >
                      {eliminator.totalKills}
                    </td>
                  </tr>
                );
              })}

              {/* Total deaths row */}
              <tr style={{ backgroundColor: 'rgba(59,130,246,0.15)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#93c5fd', fontSize: '13px', borderBottom: '1px solid #475569' }}>Total Élim.</td>
                {sortedPlayers.map((player) => (
                  <td
                    key={player.id}
                    style={{
                      padding: '6px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      color: '#93c5fd',
                      fontSize: '14px',
                      minWidth: `${cellWidth}px`,
                      borderBottom: '1px solid #475569',
                    }}
                  >
                    {player.totalDeaths}
                  </td>
                ))}
                {/* Empty corner cell */}
                <td
                  style={{
                    padding: '6px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(71,85,105,0.3)',
                    color: '#64748b',
                    minWidth: `${cellWidth}px`,
                    borderBottom: '1px solid #475569',
                  }}
                >
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #475569',
        }}>
          <h3 style={{ fontWeight: '600', color: '#f8fafc', marginBottom: '12px', fontSize: '14px' }}>Legende :</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(71,85,105,0.2)', border: '1px solid #475569' }} />
              <span style={{ color: '#94a3b8' }}>0 elimination</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(251,191,36,0.4)' }} />
              <span style={{ color: '#94a3b8' }}>1 elimination</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(249,115,22,0.5)' }} />
              <span style={{ color: '#94a3b8' }}>2 eliminations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.6)' }} />
              <span style={{ color: '#94a3b8' }}>3+ (rivalite !)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(71,85,105,0.4)' }} />
              <span style={{ color: '#94a3b8' }}>Diagonale (soi-meme)</span>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
            <strong>Lecture :</strong> Chaque cellule indique combien de fois le joueur de la ligne a elimine le joueur de la colonne.
          </div>
        </div>
      </div>

      {/* Footer - Fond vert poker */}
      <div style={{
        backgroundColor: '#1a472a',
        padding: '16px 40px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0' }}>
          WPT Villelaure - {seasonName}
        </p>
      </div>
    </div>
  );
}
