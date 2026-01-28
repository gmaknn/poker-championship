'use client';

import React from 'react';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

interface TournamentResult {
  tournamentId: string;
  tournamentNumber: number;
  points: number;
  rank?: number;
}

interface PlayerEvolution {
  rank: number;
  nickname: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  totalPoints: number;
  tournamentResults: TournamentResult[];
}

interface SeasonEvolutionChartProps {
  seasonName: string;
  seasonYear?: number;
  players: PlayerEvolution[];
  tournamentCount: number;
}

/**
 * Get background color based on points value (light theme)
 */
function getPointsColor(points: number): string {
  if (points === 0) {
    return 'rgba(148,163,184,0.2)'; // slate-400 light
  }

  if (points > 0) {
    // Green gradients for positive points
    if (points >= 400) return 'rgba(22,163,74,0.7)'; // green-600
    if (points >= 200) return 'rgba(34,197,94,0.6)'; // green-500
    return 'rgba(134,239,172,0.5)'; // green-300
  }

  // Red gradients for negative points
  return 'rgba(248,113,113,0.5)'; // red-400
}

/**
 * Get text color based on background brightness (light theme)
 */
function getTextColor(points: number): string {
  if (points === 0) return '#64748b'; // slate-500
  if (points >= 400) return '#ffffff';
  if (points >= 200) return '#14532d';
  if (points > 0) return '#166534';
  return '#991b1b'; // red dark
}

export default function SeasonEvolutionChart({
  seasonName,
  seasonYear,
  players,
  tournamentCount,
}: SeasonEvolutionChartProps) {
  // Create array of tournament numbers [1, 2, 3, ..., tournamentCount]
  const tournamentNumbers = Array.from({ length: tournamentCount }, (_, i) => i + 1);

  return (
    <div
      id="season-evolution-chart"
      style={{
        width: '100%',
        minWidth: `${500 + tournamentCount * 55}px`,
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
            Evolution par points
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
        {/* Zone Master Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '14px',
          marginBottom: '16px',
          background: 'linear-gradient(90deg, rgba(202,138,4,0.05) 0%, rgba(202,138,4,0.15) 50%, rgba(202,138,4,0.05) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(202,138,4,0.3)',
        }}>
          <span style={{ fontSize: '20px' }}>⭐</span>
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#a16207' }}>Zone Master - Top 10</span>
          <span style={{ fontSize: '20px' }}>⭐</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#e2e8f0' }}>
              <th style={{ padding: '14px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600', width: '50px' }}>
                #
              </th>
              <th style={{ padding: '14px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600', minWidth: '160px' }}>
                Joueur
              </th>
              {tournamentNumbers.map((num) => (
                <th
                  key={num}
                  style={{ padding: '10px 4px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '13px', fontWeight: '600', width: '50px' }}
                >
                  T{num}
                </th>
              ))}
              <th style={{ padding: '14px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#ca8a04', fontSize: '15px', fontWeight: '600', width: '70px' }}>
                TOTAL
              </th>
            </tr>
          </thead>

          <tbody>
            {players.map((player, index) => {
              // Create a map of tournament results for quick lookup
              const resultsMap = new Map(
                player.tournamentResults.map((r) => [r.tournamentNumber, r])
              );

              const isTop3 = player.rank <= 3;
              const isTop10 = player.rank <= 10;

              let bgColor: string;
              let borderLeft: string | undefined;

              if (isTop3) {
                bgColor = 'rgba(250,204,21,0.15)';
                borderLeft = '3px solid #ca8a04';
              } else if (isTop10) {
                bgColor = 'rgba(34,197,94,0.1)';
                borderLeft = undefined;
              } else {
                bgColor = index % 2 === 0 ? '#ffffff' : '#f1f5f9';
                borderLeft = undefined;
              }

              return (
                <React.Fragment key={player.rank}>
                  {/* Separator after Top 10 */}
                  {player.rank === 11 && (
                    <tr>
                      <td colSpan={tournamentNumbers.length + 3} style={{ padding: '0', height: '2px', backgroundColor: '#ca8a04' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    {/* Rang */}
                    <td style={{
                      padding: '12px 14px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      color: player.rank === 1 ? '#ca8a04' : player.rank === 2 ? '#64748b' : player.rank === 3 ? '#c2410c' : isTop10 ? '#a16207' : '#1e293b',
                      borderBottom: '1px solid #cbd5e1',
                    }}>
                      {player.rank <= 3 ? '🏆 ' : player.rank <= 10 ? '🎖️ ' : ''}{player.rank}
                    </td>

                    {/* Joueur */}
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Avatar */}
                        {isValidAvatarUrl(player.avatar) ? (
                          <img
                            src={normalizeAvatarSrc(player.avatar)!}
                            alt=""
                            crossOrigin="anonymous"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #cbd5e1', objectFit: 'cover', backgroundColor: '#e2e8f0' }}
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>
                            {player.firstName?.[0] || player.nickname[0]}{player.lastName?.[0] || ''}
                          </div>
                        )}
                        {/* Nom et pseudo */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '18px', color: '#1e293b', fontWeight: '500' }}>
                            {player.firstName && player.lastName ? `${player.firstName} ${player.lastName}` : player.nickname}
                          </span>
                          {player.firstName && player.lastName && (
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                              @{player.nickname}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Resultats par tournoi */}
                    {tournamentNumbers.map((num) => {
                      const result = resultsMap.get(num);
                      const points = result?.points ?? null;

                      if (points === null) {
                        // Player didn't participate
                        return (
                          <td
                            key={num}
                            style={{ padding: '8px 4px', textAlign: 'center', backgroundColor: 'rgba(148,163,184,0.15)', color: '#94a3b8', fontSize: '14px', borderBottom: '1px solid #cbd5e1' }}
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
                          style={{ padding: '8px 4px', textAlign: 'center', backgroundColor: bgColorCell, color: textColor, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid #cbd5e1' }}
                        >
                          {points > 0 ? `+${points}` : points}
                        </td>
                      );
                    })}

                    {/* Total */}
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', color: '#ca8a04', borderBottom: '1px solid #cbd5e1' }}>
                      {player.totalPoints}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

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
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(22,163,74,0.7)' }} />
              <span style={{ color: '#64748b' }}>400+ pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(34,197,94,0.6)' }} />
              <span style={{ color: '#64748b' }}>200-399 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(134,239,172,0.5)' }} />
              <span style={{ color: '#64748b' }}>1-199 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(148,163,184,0.15)', border: '1px solid #cbd5e1' }} />
              <span style={{ color: '#64748b' }}>Non participe</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(248,113,113,0.5)' }} />
              <span style={{ color: '#64748b' }}>Negatif (penalite)</span>
            </div>
          </div>
        </div>

        {/* Message Zone Master */}
        <div style={{ textAlign: 'center', marginTop: '20px', padding: '12px' }}>
          <p style={{ color: '#a16207', fontSize: '16px', margin: '0' }}>
            ⭐ Les 10 premiers disputent le Master de fin d'annee ⭐
          </p>
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
