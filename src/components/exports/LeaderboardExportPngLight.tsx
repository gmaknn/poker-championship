'use client';

import React from 'react';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

export type LeaderboardExportPlayer = {
  rank: number;
  playerId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  totalPoints: number;
  averagePoints: number;
  tournamentsCount: number;
  victories: number;
  podiums: number;
  rankChange?: number;
};

export type LeaderboardExportProps = {
  seasonName: string;
  seasonYear: number;
  players: LeaderboardExportPlayer[];
  tournamentsPlayed: number;
};

export default function LeaderboardExportPngLight({
  seasonName,
  seasonYear,
  players,
  tournamentsPlayed,
}: LeaderboardExportProps) {
  return (
    <div
      id="leaderboard-export-png-light"
      style={{
        width: '100%',
        minWidth: '1200px',
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
            Classement General - Saison {seasonYear}
          </h1>
          <p style={{ color: '#86efac', margin: '0', fontSize: '18px' }}>
            {tournamentsPlayed} tournoi(s) joue(s)
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
        {/* Podium Top 3 */}
        {players.length >= 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '48px', marginBottom: '40px' }}>
            {/* 2ème */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(players[1].avatar) ? (
                <img
                  src={normalizeAvatarSrc(players[1].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #9ca3af', objectFit: 'cover', backgroundColor: '#e2e8f0' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #9ca3af', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#64748b' }}>
                  {players[1].firstName[0]}{players[1].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#64748b' }}>2</div>
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '18px' }}>{players[1].firstName} {players[1].lastName}</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#64748b' }}>{players[1].totalPoints} pts</div>
              </div>
            </div>

            {/* 1er */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
              {isValidAvatarUrl(players[0].avatar) ? (
                <img
                  src={normalizeAvatarSrc(players[0].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #ca8a04', objectFit: 'cover', backgroundColor: '#fef3c7' }}
                />
              ) : (
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #ca8a04', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#ca8a04' }}>
                  {players[0].firstName[0]}{players[0].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#ca8a04' }}>1</div>
                <div style={{ fontWeight: 'bold', fontSize: '22px', color: '#1e293b' }}>{players[0].firstName} {players[0].lastName}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ca8a04' }}>{players[0].totalPoints} pts</div>
              </div>
            </div>

            {/* 3ème */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(players[2].avatar) ? (
                <img
                  src={normalizeAvatarSrc(players[2].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #c2410c', objectFit: 'cover', backgroundColor: '#fed7aa' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #c2410c', backgroundColor: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#c2410c' }}>
                  {players[2].firstName[0]}{players[2].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#c2410c' }}>3</div>
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '18px' }}>{players[2].firstName} {players[2].lastName}</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ea580c' }}>{players[2].totalPoints} pts</div>
              </div>
            </div>
          </div>
        )}

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
              <th style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Rang</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Joueur</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Points</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Diff sup.</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Tendance</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Tournois</th>
            </tr>
          </thead>
          <tbody>
            {players.map((entry, index) => {
              const isTop3 = entry.rank <= 3;
              const isTop10 = entry.rank <= 10;

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

              const diffWithAbove = index === 0 ? null : entry.totalPoints - players[index - 1].totalPoints;

              return (
                <React.Fragment key={entry.playerId}>
                  {entry.rank === 11 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '0', height: '2px', backgroundColor: '#ca8a04' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    <td style={{ padding: '12px 20px', fontWeight: 'bold', fontSize: '18px', color: entry.rank === 1 ? '#ca8a04' : entry.rank === 2 ? '#64748b' : entry.rank === 3 ? '#c2410c' : isTop10 ? '#a16207' : '#1e293b', borderBottom: '1px solid #cbd5e1' }}>
                      {entry.rank <= 3 ? '🏆 ' : entry.rank <= 10 ? '🎖️ ' : ''}{entry.rank}
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isValidAvatarUrl(entry.avatar) ? (
                          <img
                            src={normalizeAvatarSrc(entry.avatar)!}
                            alt=""
                            crossOrigin="anonymous"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #cbd5e1', objectFit: 'cover', backgroundColor: '#e2e8f0' }}
                          />
                        ) : (
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>
                            {entry.firstName[0]}{entry.lastName[0]}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '18px', color: '#1e293b', fontWeight: '500' }}>
                            {entry.firstName} {entry.lastName}
                          </span>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>
                            @{entry.nickname}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px', color: '#ca8a04', borderBottom: '1px solid #cbd5e1' }}>{entry.totalPoints}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '18px', color: diffWithAbove === null ? '#ca8a04' : '#dc2626', fontWeight: diffWithAbove === null ? 'bold' : 'normal', borderBottom: '1px solid #cbd5e1' }}>
                      {diffWithAbove === null ? 'Leader' : diffWithAbove}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '16px', borderBottom: '1px solid #cbd5e1' }}>
                      {entry.rankChange === undefined ? (
                        <span style={{ color: '#2563eb', fontWeight: 'bold', padding: '4px 10px', backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: '6px', border: '1px solid #2563eb' }}>NEW</span>
                      ) : entry.rankChange > 0 ? (
                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>▲ +{entry.rankChange}</span>
                      ) : entry.rankChange < 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>▼ {entry.rankChange}</span>
                      ) : (
                        <span style={{ color: '#64748b' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '18px', color: '#16a34a', borderBottom: '1px solid #cbd5e1' }}>{entry.tournamentsCount}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

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
          WPT Villelaure - Saison {seasonYear}
        </p>
      </div>
    </div>
  );
}
