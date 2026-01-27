'use client';

import React from 'react';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

interface EliminationVictim {
  nickname: string;
  count: number;
}

interface PlayerRanking {
  rank: number;
  nickname: string;
  firstName?: string;
  lastName?: string;
  avatar: string | null;
  totalPoints: number;
  pointsChange: number; // Points gagnés lors du dernier tournoi
  victims: EliminationVictim[]; // Joueurs que ce joueur a éliminés
}

interface SeasonLeaderboardWithEliminationsProps {
  seasonName: string;
  seasonYear?: number;
  players: PlayerRanking[];
}

export default function SeasonLeaderboardWithEliminations({
  seasonName,
  seasonYear,
  players,
}: SeasonLeaderboardWithEliminationsProps) {
  return (
    <div
      id="season-leaderboard-eliminations"
      style={{
        width: '100%',
        minWidth: '1200px',
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
            Classement avec Eliminations
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
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600', width: '60px' }}>
                #
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600', minWidth: '180px' }}>
                Joueur
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#fde047', fontSize: '13px', fontWeight: '600', width: '80px' }}>
                POINTS
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600', width: '100px' }}>
                Dernier tournoi
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>
                Victimes
              </th>
            </tr>
          </thead>

          <tbody>
            {players.map((player, index) => {
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
                bgColor = index % 2 === 0 ? '#1e293b' : '#273449';
                borderLeft = undefined;
              }

              const pointsChangeColor =
                player.pointsChange > 0
                  ? '#4ade80'
                  : player.pointsChange < 0
                  ? '#f87171'
                  : '#94a3b8';

              return (
                <React.Fragment key={player.rank}>
                  {/* Separator after Top 10 */}
                  {player.rank === 11 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '0', height: '2px', backgroundColor: '#fbbf24' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    {/* Rang */}
                    <td style={{
                      padding: '10px 16px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      color: player.rank === 1 ? '#fbbf24' : player.rank === 2 ? '#9ca3af' : player.rank === 3 ? '#ea580c' : isTop10 ? '#fde68a' : '#f8fafc',
                      borderBottom: '1px solid #475569',
                    }}>
                      {player.rank <= 3 ? '🏆 ' : player.rank <= 10 ? '🎖️ ' : ''}{player.rank}
                    </td>

                    {/* Joueur avec avatar */}
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Avatar */}
                        {isValidAvatarUrl(player.avatar) ? (
                          <img
                            src={normalizeAvatarSrc(player.avatar)!}
                            alt=""
                            crossOrigin="anonymous"
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>
                            {player.firstName?.[0] || player.nickname[0]}{player.lastName?.[0] || ''}
                          </div>
                        )}
                        {/* Nom et pseudo */}
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

                    {/* Points totaux */}
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fde047', borderBottom: '1px solid #475569' }}>
                      {player.totalPoints}
                    </td>

                    {/* Points du dernier tournoi */}
                    <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600', fontSize: '14px', color: pointsChangeColor, borderBottom: '1px solid #475569' }}>
                      {player.pointsChange > 0 ? '+' : ''}
                      {player.pointsChange}
                    </td>

                    {/* Victimes */}
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #475569' }}>
                      {player.victims.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                          {player.victims.map((victim, vIndex) => (
                            <div
                              key={vIndex}
                              style={{
                                padding: '3px 8px',
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {victim.nickname}
                              {victim.count > 1 && (
                                <span style={{ marginLeft: '4px', color: '#fde047' }}>x{victim.count}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic' }}>Aucune</span>
                      )}
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
          <ul style={{ fontSize: '13px', color: '#94a3b8', margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
            <li style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: '600' }}>Dernier tournoi :</span> Points gagnes lors du dernier tournoi joue
            </li>
            <li style={{ marginBottom: '4px' }}>
              <span style={{ fontWeight: '600' }}>Victimes :</span> Joueurs elimines par ce joueur durant la saison
            </li>
            <li>
              <span style={{ color: '#fde047', fontWeight: '600' }}>xN :</span> Nombre d'eliminations du meme joueur
            </li>
          </ul>
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
