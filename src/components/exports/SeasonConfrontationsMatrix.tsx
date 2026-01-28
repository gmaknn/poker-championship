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
 * Get background color based on elimination count (light theme)
 */
function getEliminationColor(count: number): string {
  if (count === 0) return 'rgba(148,163,184,0.15)'; // slate-400 light
  if (count === 1) return 'rgba(251,191,36,0.35)'; // amber
  if (count === 2) return 'rgba(249,115,22,0.45)'; // orange
  if (count >= 3) return 'rgba(239,68,68,0.55)'; // red (rivalry!)
  return 'rgba(148,163,184,0.15)';
}

/**
 * Get text color based on background (light theme)
 */
function getTextColor(count: number): string {
  if (count >= 3) return '#7f1d1d';
  if (count >= 2) return '#9a3412';
  if (count >= 1) return '#92400e';
  return '#94a3b8';
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

  // Calculate width - larger cells
  const cellWidth = 42;
  const headerWidth = 150;

  return (
    <div
      id="season-confrontations-matrix"
      style={{
        width: '100%',
        backgroundColor: '#f8fafc',
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
            style={{ width: '120px', height: 'auto' }}
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
            style={{ width: '120px', height: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Contenu principal - Fond clair */}
      <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc' }}>
        {/* Matrix table - Full width */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            {/* Header row with victim names */}
            <thead>
              <tr style={{ backgroundColor: '#e2e8f0' }}>
                {/* Top-left corner cell */}
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #cbd5e1',
                    color: '#1e293b',
                    fontSize: '11px',
                    fontWeight: '600',
                    minWidth: `${headerWidth}px`,
                  }}
                >
                  Eliminateur / Victime
                </th>
                {/* Victim names (columns) - rotation 45° */}
                {sortedPlayers.map((player) => (
                  <th
                    key={player.id}
                    style={{
                      padding: '4px',
                      textAlign: 'left',
                      borderBottom: '2px solid #cbd5e1',
                      color: '#1e293b',
                      fontSize: '12px',
                      fontWeight: '600',
                      minWidth: `${cellWidth}px`,
                      maxWidth: `${cellWidth}px`,
                      height: '100px',
                      verticalAlign: 'bottom',
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'left bottom',
                      whiteSpace: 'nowrap',
                      position: 'absolute',
                      bottom: '8px',
                      left: '50%',
                    }}>
                      {player.nickname.length > 10 ? player.nickname.slice(0, 10) + '.' : player.nickname}
                    </div>
                  </th>
                ))}
                {/* Total kills column header */}
                <th
                  style={{
                    padding: '4px',
                    textAlign: 'left',
                    borderBottom: '2px solid #cbd5e1',
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: '600',
                    minWidth: `${cellWidth}px`,
                    height: '100px',
                    verticalAlign: 'bottom',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'left bottom',
                    whiteSpace: 'nowrap',
                    position: 'absolute',
                    bottom: '8px',
                    left: '50%',
                  }}>
                    TOTAL KO
                  </div>
                </th>
              </tr>
            </thead>

            {/* Body rows */}
            <tbody>
              {sortedPlayers.map((eliminator, rowIndex) => {
                const bgColor = rowIndex % 2 === 0 ? '#ffffff' : '#f1f5f9';

                return (
                  <tr key={eliminator.id} style={{ backgroundColor: bgColor }}>
                    {/* Eliminator name (row header) */}
                    <td
                      style={{
                        padding: '8px 14px',
                        fontWeight: '500',
                        color: '#1e293b',
                        fontSize: '15px',
                        maxWidth: `${headerWidth}px`,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        borderBottom: '1px solid #cbd5e1',
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
                              padding: '6px',
                              textAlign: 'center',
                              backgroundColor: 'rgba(148,163,184,0.25)',
                              color: '#94a3b8',
                              fontSize: '14px',
                              minWidth: `${cellWidth}px`,
                              borderBottom: '1px solid #cbd5e1',
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
                            padding: '6px',
                            textAlign: 'center',
                            backgroundColor: cellBg,
                            color: textColor,
                            fontSize: '15px',
                            fontWeight: count > 0 ? 'bold' : 'normal',
                            minWidth: `${cellWidth}px`,
                            borderBottom: '1px solid #cbd5e1',
                          }}
                        >
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}

                    {/* Total kills for this eliminator */}
                    <td
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        color: '#dc2626',
                        fontSize: '16px',
                        minWidth: `${cellWidth}px`,
                        borderBottom: '1px solid #cbd5e1',
                      }}
                    >
                      {eliminator.totalKills}
                    </td>
                  </tr>
                );
              })}

              {/* Total deaths row */}
              <tr style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 'bold', color: '#2563eb', fontSize: '15px', borderBottom: '1px solid #cbd5e1' }}>Total Elim.</td>
                {sortedPlayers.map((player) => (
                  <td
                    key={player.id}
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      backgroundColor: 'rgba(59,130,246,0.08)',
                      color: '#2563eb',
                      fontSize: '16px',
                      minWidth: `${cellWidth}px`,
                      borderBottom: '1px solid #cbd5e1',
                    }}
                  >
                    {player.totalDeaths}
                  </td>
                ))}
                {/* Empty corner cell */}
                <td
                  style={{
                    padding: '8px',
                    textAlign: 'center',
                    backgroundColor: 'rgba(148,163,184,0.2)',
                    color: '#94a3b8',
                    minWidth: `${cellWidth}px`,
                    borderBottom: '1px solid #cbd5e1',
                  }}
                >
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legende */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
        }}>
          <h3 style={{ fontWeight: '600', color: '#1e293b', marginBottom: '12px', fontSize: '14px' }}>Legende :</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(148,163,184,0.15)', border: '1px solid #cbd5e1' }} />
              <span style={{ color: '#64748b' }}>0 elimination</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(251,191,36,0.35)' }} />
              <span style={{ color: '#64748b' }}>1 elimination</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(249,115,22,0.45)' }} />
              <span style={{ color: '#64748b' }}>2 eliminations</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.55)' }} />
              <span style={{ color: '#64748b' }}>3+ (rivalite !)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(148,163,184,0.25)' }} />
              <span style={{ color: '#64748b' }}>Diagonale (soi-meme)</span>
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
