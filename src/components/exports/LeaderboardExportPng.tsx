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
  rankChange?: number; // Positive = moved up, negative = moved down, undefined = new
};

export type LeaderboardExportProps = {
  seasonName: string;
  seasonYear: number;
  players: LeaderboardExportPlayer[];
  tournamentsPlayed: number;
};

/**
 * Composant d'export PNG unifié pour le classement général
 * Utilisé par /dashboard/leaderboard et /dashboard/seasons/[id]/exports
 *
 * Design: Fond vert tapis de poker, Zone Master, tendances, podium Top 3
 */
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
        width: '1200px',
        backgroundColor: '#1a472a', // Fond vert tapis de poker
        padding: '40px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 12px 0' }}>
          Classement General - {seasonName} {seasonYear}
        </h1>
        <p style={{ color: '#86efac', margin: '0', fontSize: '20px' }}>
          {tournamentsPlayed} tournoi(s) joue(s)
        </p>
      </div>

      {/* Podium Top 3 */}
      {players.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '48px', marginBottom: '40px' }}>
          {/* 2ème */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isValidAvatarUrl(players[1].avatar) && (
              <img
                src={normalizeAvatarSrc(players[1].avatar)!}
                alt=""
                style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #9ca3af' }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#9ca3af' }}>2</div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '18px' }}>{players[1].firstName} {players[1].lastName}</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#d1d5db' }}>{players[1].totalPoints} pts</div>
            </div>
          </div>

          {/* 1er */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>&#127942;</div>
            {isValidAvatarUrl(players[0].avatar) && (
              <img
                src={normalizeAvatarSrc(players[0].avatar)!}
                alt=""
                style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #eab308' }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#eab308' }}>1</div>
              <div style={{ fontWeight: 'bold', fontSize: '22px', color: '#ffffff' }}>{players[0].firstName} {players[0].lastName}</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fde047' }}>{players[0].totalPoints} pts</div>
            </div>
          </div>

          {/* 3ème */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isValidAvatarUrl(players[2].avatar) && (
              <img
                src={normalizeAvatarSrc(players[2].avatar)!}
                alt=""
                style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #ea580c' }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ea580c' }}>3</div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '18px' }}>{players[2].firstName} {players[2].lastName}</div>
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
        padding: '16px',
        marginBottom: '20px',
        background: 'linear-gradient(90deg, rgba(234,179,8,0.1) 0%, rgba(234,179,8,0.25) 50%, rgba(234,179,8,0.1) 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(234,179,8,0.4)',
      }}>
        <span style={{ fontSize: '24px' }}>&#11088;</span>
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#fde047' }}>Zone Master - Top 10</span>
        <span style={{ fontSize: '24px' }}>&#11088;</span>
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#0d3320' }}>
            <th style={{ padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '18px', fontWeight: 'bold' }}>Rang</th>
            <th style={{ padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '18px', fontWeight: 'bold' }}>Tendance</th>
            <th style={{ padding: '16px 20px', textAlign: 'left', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '18px', fontWeight: 'bold' }}>Joueur</th>
            <th style={{ padding: '16px 20px', textAlign: 'right', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '18px', fontWeight: 'bold' }}>Points</th>
            <th style={{ padding: '16px 20px', textAlign: 'right', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '18px', fontWeight: 'bold' }}>Moyenne</th>
            <th style={{ padding: '16px 20px', textAlign: 'right', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '18px', fontWeight: 'bold' }}>Tournois</th>
          </tr>
        </thead>
        <tbody>
          {players.map((entry, index) => {
            const isTop3 = entry.rank <= 3;
            const isTop10 = entry.rank <= 10;
            const bgColor = isTop3
              ? 'rgba(234,179,8,0.15)'
              : isTop10
              ? 'rgba(234,179,8,0.08)'
              : index % 2 === 0
              ? '#1a472a'
              : '#153d24';

            return (
              <React.Fragment key={entry.playerId}>
                {/* Separator after Top 10 */}
                {entry.rank === 11 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '0', height: '4px', backgroundColor: '#eab308' }} />
                  </tr>
                )}
                <tr style={{ backgroundColor: bgColor }}>
                  <td style={{ padding: '14px 20px', fontWeight: 'bold', fontSize: '20px', color: entry.rank === 1 ? '#eab308' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#ea580c' : isTop10 ? '#fde68a' : '#ffffff' }}>
                    {entry.rank <= 3 ? '&#127942; ' : entry.rank <= 10 ? '&#127941; ' : ''}{entry.rank}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '16px' }}>
                    {entry.rankChange === undefined ? (
                      <span style={{ color: '#60a5fa', fontWeight: 'bold', padding: '4px 10px', backgroundColor: 'rgba(96,165,250,0.2)', borderRadius: '6px', border: '1px solid #60a5fa' }}>NEW</span>
                    ) : entry.rankChange > 0 ? (
                      <span style={{ color: '#4ade80', fontWeight: 'bold' }}>&#9650; +{entry.rankChange}</span>
                    ) : entry.rankChange < 0 ? (
                      <span style={{ color: '#f87171', fontWeight: 'bold' }}>&#9660; {entry.rankChange}</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '18px', color: '#ffffff', fontWeight: '500' }}>
                    {entry.firstName} {entry.lastName}
                    <span style={{ color: '#86efac', marginLeft: '10px', fontSize: '16px' }}>@{entry.nickname}</span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 'bold', fontSize: '22px', color: '#fde047' }}>{entry.totalPoints}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '18px', color: '#bbf7d0' }}>{entry.averagePoints}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right', fontSize: '18px', color: '#bbf7d0' }}>{entry.tournamentsCount}</td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '24px', padding: '16px' }}>
        <p style={{ color: '#86efac', fontSize: '18px', margin: '0' }}>
          &#11088; Les 10 premiers disputent le Master de fin d'annee &#11088;
        </p>
      </div>
    </div>
  );
}
