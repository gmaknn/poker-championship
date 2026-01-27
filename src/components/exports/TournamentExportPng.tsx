'use client';

import React from 'react';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';

export type TournamentExportPlayer = {
  rank: number;
  playerId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  prizeAmount: number | null;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
};

export type TournamentExportProps = {
  tournamentName: string;
  tournamentDate: string;
  tournamentNumber?: number;
  seasonName: string;
  seasonYear: number;
  buyInAmount: number;
  prizePool: number | null;
  players: TournamentExportPlayer[];
};

/**
 * Composant d'export PNG pour un tournoi individuel
 * Design: Fond vert tapis de poker, podium Top 3, tableau des points
 */
export default function TournamentExportPng({
  tournamentName,
  tournamentDate,
  tournamentNumber,
  seasonName,
  seasonYear,
  buyInAmount,
  prizePool,
  players,
}: TournamentExportProps) {
  const formattedDate = new Date(tournamentDate).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const top3 = players.slice(0, 3);
  const totalRebuys = players.reduce((sum, p) => sum + p.rebuysCount, 0);

  return (
    <div
      id="tournament-export-png"
      style={{
        width: '100%',
        minWidth: '1200px',
        backgroundColor: '#1a472a',
        padding: '40px',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>
          {tournamentName || `Tournoi #${tournamentNumber}`}
        </h1>
        <p style={{ color: '#86efac', margin: '0 0 4px 0', fontSize: '20px' }}>
          {seasonName} {seasonYear}
        </p>
        <p style={{ color: '#9ca3af', margin: '0', fontSize: '16px' }}>
          {formattedDate} - {players.length} joueurs
        </p>
      </div>

      {/* Prize Pool Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '40px',
        marginBottom: '32px',
        padding: '16px',
        background: 'linear-gradient(90deg, rgba(234,179,8,0.1) 0%, rgba(234,179,8,0.2) 50%, rgba(234,179,8,0.1) 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(234,179,8,0.3)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Buy-in</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047' }}>{buyInAmount}€</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Recaves</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047' }}>{totalRebuys}</div>
        </div>
        {prizePool !== null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '4px' }}>Prize Pool</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047' }}>{prizePool}€</div>
          </div>
        )}
      </div>

      {/* Podium Top 3 */}
      {top3.length >= 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '32px', marginBottom: '40px' }}>
          {/* 2ème */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isValidAvatarUrl(top3[1].avatar) && (
              <img
                src={normalizeAvatarSrc(top3[1].avatar)!}
                alt=""
                style={{ width: '70px', height: '70px', borderRadius: '50%', marginBottom: '8px', border: '3px solid #9ca3af' }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9ca3af' }}>🥈 2</div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '16px' }}>{top3[1].nickname}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d1d5db' }}>{top3[1].totalPoints} pts</div>
              {top3[1].prizeAmount !== null && top3[1].prizeAmount > 0 && (
                <div style={{ fontSize: '14px', color: '#4ade80' }}>{top3[1].prizeAmount}€</div>
              )}
            </div>
          </div>

          {/* 1er */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '4px' }}>🏆</div>
            {isValidAvatarUrl(top3[0].avatar) && (
              <img
                src={normalizeAvatarSrc(top3[0].avatar)!}
                alt=""
                style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #eab308' }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#eab308' }}>🥇 1</div>
              <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#ffffff' }}>{top3[0].nickname}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047' }}>{top3[0].totalPoints} pts</div>
              {top3[0].prizeAmount !== null && top3[0].prizeAmount > 0 && (
                <div style={{ fontSize: '16px', color: '#4ade80', fontWeight: 'bold' }}>{top3[0].prizeAmount}€</div>
              )}
            </div>
          </div>

          {/* 3ème */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isValidAvatarUrl(top3[2].avatar) && (
              <img
                src={normalizeAvatarSrc(top3[2].avatar)!}
                alt=""
                style={{ width: '70px', height: '70px', borderRadius: '50%', marginBottom: '8px', border: '3px solid #ea580c' }}
              />
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c' }}>🥉 3</div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '16px' }}>{top3[2].nickname}</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fb923c' }}>{top3[2].totalPoints} pts</div>
              {top3[2].prizeAmount !== null && top3[2].prizeAmount > 0 && (
                <div style={{ fontSize: '14px', color: '#4ade80' }}>{top3[2].prizeAmount}€</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ffffff', borderRadius: '12px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#0d3320' }}>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '14px', fontWeight: 'bold' }}>#</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '14px', fontWeight: 'bold' }}>Joueur</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '14px', fontWeight: 'bold' }}>Classement</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '14px', fontWeight: 'bold' }}>Elim.</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '14px', fontWeight: 'bold' }}>Bonus</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#86efac', fontSize: '14px', fontWeight: 'bold' }}>Penalites</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#fde047', fontSize: '14px', fontWeight: 'bold' }}>Total</th>
            <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #166534', color: '#4ade80', fontSize: '14px', fontWeight: 'bold' }}>Gains</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => {
            const isTop3 = player.rank <= 3;
            const bgColor = isTop3
              ? 'rgba(234,179,8,0.15)'
              : index % 2 === 0
              ? '#1a472a'
              : '#153d24';

            return (
              <tr key={player.playerId} style={{ backgroundColor: bgColor }}>
                <td style={{
                  padding: '10px 16px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: player.rank === 1 ? '#eab308' : player.rank === 2 ? '#9ca3af' : player.rank === 3 ? '#ea580c' : '#ffffff'
                }}>
                  {player.rank <= 3 ? '🏆 ' : ''}{player.rank}
                </td>
                <td style={{ padding: '10px 16px', fontSize: '16px', color: '#ffffff', fontWeight: '500' }}>
                  {player.nickname}
                  {player.eliminationsCount > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#f87171' }}>
                      🔪 {player.eliminationsCount}
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#bbf7d0' }}>{player.rankPoints}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#bbf7d0' }}>{player.eliminationPoints}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#bbf7d0' }}>{player.bonusPoints}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: player.penaltyPoints < 0 ? '#f87171' : '#bbf7d0' }}>
                  {player.penaltyPoints !== 0 ? player.penaltyPoints : '-'}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fde047' }}>{player.totalPoints}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#4ade80', fontWeight: player.prizeAmount ? 'bold' : 'normal' }}>
                  {player.prizeAmount !== null && player.prizeAmount > 0 ? `${player.prizeAmount}€` : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '24px', padding: '12px' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>
          WPT Villelaure - {seasonName} {seasonYear}
        </p>
      </div>
    </div>
  );
}
