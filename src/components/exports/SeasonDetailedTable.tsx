'use client';

import React from 'react';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

interface TournamentResult {
  tournamentNumber: number;
  points: number;
  rank?: number;
}

interface PlayerDetail {
  rank: number;
  nickname: string;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  totalPoints: number;
  tournamentResults: TournamentResult[];
}

interface SeasonDetailedTableProps {
  seasonName: string;
  seasonYear?: number;
  players: PlayerDetail[];
  tournamentCount: number;
}

export default function SeasonDetailedTable({
  seasonName,
  seasonYear,
  players,
  tournamentCount,
}: SeasonDetailedTableProps) {
  const tournamentNumbers = Array.from({ length: tournamentCount }, (_, i) => i + 1);

  return (
    <div
      id="season-detailed-table"
      style={{
        width: '100%',
        minWidth: `${500 + tournamentCount * 55}px`,
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
            Detail par tournoi
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
        {/* Zone Master Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '14px',
          marginBottom: '16px',
          background: 'linear-gradient(90deg, rgba(251,191,36,0.05) 0%, rgba(251,191,36,0.15) 50%, rgba(251,191,36,0.05) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(251,191,36,0.3)',
        }}>
          <span style={{ fontSize: '20px' }}>⭐</span>
          <span style={{ fontSize: '18px', fontWeight: '600', color: '#fbbf24' }}>Zone Master - Top 10</span>
          <span style={{ fontSize: '20px' }}>⭐</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#334155' }}>
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600', width: '50px' }}>
                #
              </th>
              <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600', minWidth: '160px' }}>
                Joueur
              </th>
              {tournamentNumbers.map((num) => (
                <th
                  key={num}
                  style={{ padding: '8px 4px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '11px', fontWeight: '600', width: '45px' }}
                >
                  T{num}
                </th>
              ))}
              <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#fde047', fontSize: '13px', fontWeight: '600', width: '70px' }}>
                TOTAL
              </th>
            </tr>
          </thead>

          <tbody>
            {players.map((player, playerIndex) => {
              const isTop3 = player.rank <= 3;
              const isTop10 = player.rank <= 10;

              let bgColor: string;
              let borderLeft: string | undefined;

              if (isTop3) {
                bgColor = 'rgba(250,204,21,0.12)';
                borderLeft = '3px solid #fbbf24';
              } else if (isTop10) {
                bgColor = 'rgba(34,197,94,0.08)';
                borderLeft = undefined;
              } else {
                bgColor = playerIndex % 2 === 0 ? '#1e293b' : '#273449';
                borderLeft = undefined;
              }

              return (
                <React.Fragment key={player.rank}>
                  {player.rank === 11 && (
                    <tr>
                      <td colSpan={tournamentNumbers.length + 3} style={{ padding: '0', height: '2px', backgroundColor: '#fbbf24' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    <td style={{
                      padding: '10px 14px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      color: player.rank === 1 ? '#fbbf24' : player.rank === 2 ? '#9ca3af' : player.rank === 3 ? '#ea580c' : isTop10 ? '#fde68a' : '#f8fafc',
                      borderBottom: '1px solid #475569',
                    }}>
                      {player.rank <= 3 ? '🏆 ' : player.rank <= 10 ? '🎖️ ' : ''}{player.rank}
                    </td>

                    <td style={{ padding: '10px 14px', borderBottom: '1px solid #475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isValidAvatarUrl(player.avatar) ? (
                          <img
                            src={normalizeAvatarSrc(player.avatar)!}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>
                            {player.firstName?.[0] || player.nickname[0]}{player.lastName?.[0] || ''}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                            {player.firstName && player.lastName ? `${player.firstName} ${player.lastName}` : player.nickname}
                          </span>
                          {player.firstName && player.lastName && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                              @{player.nickname}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {tournamentNumbers.map((tournamentNum) => {
                      const result = player.tournamentResults.find(
                        (r) => r.tournamentNumber === tournamentNum
                      );

                      if (!result) {
                        return (
                          <td
                            key={tournamentNum}
                            style={{ padding: '6px 4px', textAlign: 'center', backgroundColor: 'rgba(71,85,105,0.3)', color: '#64748b', fontSize: '11px', borderBottom: '1px solid #475569' }}
                          >
                            -
                          </td>
                        );
                      }

                      const points = result.points;
                      const isPositive = points > 0;
                      const isZero = points === 0;

                      let cellBg = 'transparent';
                      let textColor = '#f8fafc';

                      if (isPositive) {
                        if (points >= 400) {
                          cellBg = '#166534';
                          textColor = '#ffffff';
                        } else if (points >= 200) {
                          cellBg = '#22c55e';
                          textColor = '#ffffff';
                        } else {
                          cellBg = '#86efac';
                          textColor = '#166534';
                        }
                      } else if (!isZero) {
                        cellBg = '#f87171';
                        textColor = '#7f1d1d';
                      }

                      return (
                        <td
                          key={tournamentNum}
                          style={{ padding: '6px 4px', textAlign: 'center', backgroundColor: cellBg, color: textColor, fontSize: '11px', fontWeight: '600', borderBottom: '1px solid #475569' }}
                        >
                          {points > 0 ? '+' : ''}{points}
                        </td>
                      );
                    })}

                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#fde047', borderBottom: '1px solid #475569' }}>
                      {player.totalPoints}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

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
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#166534' }} />
              <span style={{ color: '#94a3b8' }}>400+ pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#22c55e' }} />
              <span style={{ color: '#94a3b8' }}>200-399 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#86efac' }} />
              <span style={{ color: '#94a3b8' }}>1-199 pts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: 'rgba(71,85,105,0.3)' }} />
              <span style={{ color: '#94a3b8' }}>Non participe</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '4px', backgroundColor: '#f87171' }} />
              <span style={{ color: '#94a3b8' }}>Negatif (penalite)</span>
            </div>
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
