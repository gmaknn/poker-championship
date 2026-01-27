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

export default function LeaderboardExportPng({
  seasonName,
  seasonYear,
  players,
  tournamentsPlayed,
}: LeaderboardExportProps) {
  return (
    <div
      id="leaderboard-export-png"
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
            style={{ width: '80px', height: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Contenu principal - Fond slate */}
      <div style={{ padding: '32px 40px', backgroundColor: '#0f172a' }}>
        {/* Podium Top 3 */}
        {players.length >= 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '48px', marginBottom: '40px' }}>
            {/* 2ème */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(players[1].avatar) ? (
                <img
                  src={normalizeAvatarSrc(players[1].avatar)!}
                  alt=""
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #9ca3af', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #9ca3af', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#9ca3af' }}>
                  {players[1].firstName[0]}{players[1].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9ca3af' }}>2</div>
                <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '18px' }}>{players[1].firstName} {players[1].lastName}</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#d1d5db' }}>{players[1].totalPoints} pts</div>
              </div>
            </div>

            {/* 1er */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
              {isValidAvatarUrl(players[0].avatar) ? (
                <img
                  src={normalizeAvatarSrc(players[0].avatar)!}
                  alt=""
                  style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #fbbf24', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #fbbf24', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
                  {players[0].firstName[0]}{players[0].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#fbbf24' }}>1</div>
                <div style={{ fontWeight: 'bold', fontSize: '22px', color: '#f8fafc' }}>{players[0].firstName} {players[0].lastName}</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fde047' }}>{players[0].totalPoints} pts</div>
              </div>
            </div>

            {/* 3ème */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(players[2].avatar) ? (
                <img
                  src={normalizeAvatarSrc(players[2].avatar)!}
                  alt=""
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #ea580c', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #ea580c', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#ea580c' }}>
                  {players[2].firstName[0]}{players[2].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ea580c' }}>3</div>
                <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '18px' }}>{players[2].firstName} {players[2].lastName}</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fb923c' }}>{players[2].totalPoints} pts</div>
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
              <th style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>Rang</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>Joueur</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>Points</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>Diff sup.</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>Tendance</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '15px', fontWeight: '600' }}>Tournois</th>
            </tr>
          </thead>
          <tbody>
            {players.map((entry, index) => {
              const isTop3 = entry.rank <= 3;
              const isTop10 = entry.rank <= 10;

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

              const diffWithAbove = index === 0 ? null : entry.totalPoints - players[index - 1].totalPoints;

              return (
                <React.Fragment key={entry.playerId}>
                  {entry.rank === 11 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '0', height: '2px', backgroundColor: '#fbbf24' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    <td style={{ padding: '12px 20px', fontWeight: 'bold', fontSize: '18px', color: entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#ea580c' : isTop10 ? '#fde68a' : '#f8fafc', borderBottom: '1px solid #475569' }}>
                      {entry.rank <= 3 ? '🏆 ' : entry.rank <= 10 ? '🎖️ ' : ''}{entry.rank}
                    </td>
                    <td style={{ padding: '12px 20px', borderBottom: '1px solid #475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {isValidAvatarUrl(entry.avatar) ? (
                          <img
                            src={normalizeAvatarSrc(entry.avatar)!}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>
                            {entry.firstName[0]}{entry.lastName[0]}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                            {entry.firstName} {entry.lastName}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            @{entry.nickname}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 'bold', fontSize: '20px', color: '#fde047', borderBottom: '1px solid #475569' }}>{entry.totalPoints}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '14px', color: diffWithAbove === null ? '#fbbf24' : '#f87171', fontWeight: diffWithAbove === null ? 'bold' : 'normal', borderBottom: '1px solid #475569' }}>
                      {diffWithAbove === null ? 'Leader' : diffWithAbove}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '14px', borderBottom: '1px solid #475569' }}>
                      {entry.rankChange === undefined ? (
                        <span style={{ color: '#60a5fa', fontWeight: 'bold', padding: '4px 10px', backgroundColor: 'rgba(96,165,250,0.2)', borderRadius: '6px', border: '1px solid #60a5fa' }}>NEW</span>
                      ) : entry.rankChange > 0 ? (
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>▲ +{entry.rankChange}</span>
                      ) : entry.rankChange < 0 ? (
                        <span style={{ color: '#f87171', fontWeight: 'bold' }}>▼ {entry.rankChange}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: '16px', color: '#86efac', borderBottom: '1px solid #475569' }}>{entry.tournamentsCount}</td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Message Zone Master */}
        <div style={{ textAlign: 'center', marginTop: '20px', padding: '12px' }}>
          <p style={{ color: '#fbbf24', fontSize: '16px', margin: '0' }}>
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
