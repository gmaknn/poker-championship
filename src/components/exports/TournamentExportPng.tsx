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
            {tournamentName || `Tournoi #${tournamentNumber}`}
          </h1>
          <p style={{ color: '#86efac', margin: '0 0 4px 0', fontSize: '18px' }}>
            Saison {seasonYear}
          </p>
          <p style={{ color: '#9ca3af', margin: '0', fontSize: '14px' }}>
            {formattedDate} - {players.length} joueurs
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
        {/* Prize Pool Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginBottom: '32px',
          padding: '16px 32px',
          background: 'linear-gradient(90deg, rgba(251,191,36,0.05) 0%, rgba(251,191,36,0.12) 50%, rgba(251,191,36,0.05) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(251,191,36,0.25)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buy-in</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fde047' }}>{buyInAmount}€</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recaves</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fde047' }}>{totalRebuys}</div>
          </div>
          {prizePool !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prize Pool</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#fde047' }}>{prizePool}€</div>
            </div>
          )}
        </div>

        {/* Podium Top 3 */}
        {top3.length >= 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '60px', marginBottom: '40px' }}>
            {/* 2ème */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(top3[1].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[1].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '70px', height: '70px', borderRadius: '50%', marginBottom: '8px', border: '3px solid #9ca3af', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', marginBottom: '8px', border: '3px solid #9ca3af', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#9ca3af' }}>
                  {top3[1].firstName[0]}{top3[1].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#9ca3af' }}>🥈 2</div>
                <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '16px' }}>{top3[1].firstName} {top3[1].lastName}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>@{top3[1].nickname}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d1d5db' }}>{top3[1].totalPoints} pts</div>
              </div>
            </div>

            {/* 1er */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '4px' }}>🏆</div>
              {isValidAvatarUrl(top3[0].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[0].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #fbbf24', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #fbbf24', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#fbbf24' }}>
                  {top3[0].firstName[0]}{top3[0].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fbbf24' }}>🥇 1</div>
                <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#f8fafc' }}>{top3[0].firstName} {top3[0].lastName}</div>
                <div style={{ fontSize: '13px', color: '#94a3b8' }}>@{top3[0].nickname}</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047' }}>{top3[0].totalPoints} pts</div>
              </div>
            </div>

            {/* 3ème */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(top3[2].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[2].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '70px', height: '70px', borderRadius: '50%', marginBottom: '8px', border: '3px solid #ea580c', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '70px', height: '70px', borderRadius: '50%', marginBottom: '8px', border: '3px solid #ea580c', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#ea580c' }}>
                  {top3[2].firstName[0]}{top3[2].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c' }}>🥉 3</div>
                <div style={{ fontWeight: '600', color: '#f8fafc', fontSize: '16px' }}>{top3[2].firstName} {top3[2].lastName}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>@{top3[2].nickname}</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fb923c' }}>{top3[2].totalPoints} pts</div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#334155' }}>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>#</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '13px', fontWeight: '600' }}>Joueur</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#86efac', fontSize: '13px', fontWeight: '600' }}>Classement</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#60a5fa', fontSize: '13px', fontWeight: '600' }}>Elim.</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#60a5fa', fontSize: '13px', fontWeight: '600' }}>Bonus</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f87171', fontSize: '13px', fontWeight: '600' }}>Penalites</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#fde047', fontSize: '13px', fontWeight: '600' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#4ade80', fontSize: '13px', fontWeight: '600' }}>Gains</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isTop3 = player.rank <= 3;

              let bgColor: string;
              let borderLeft: string | undefined;

              if (isTop3) {
                bgColor = 'rgba(250,204,21,0.12)';
                borderLeft = '3px solid #fbbf24';
              } else {
                bgColor = index % 2 === 0 ? '#1e293b' : '#273449';
                borderLeft = undefined;
              }

              return (
                <tr key={player.playerId} style={{ backgroundColor: bgColor, borderLeft }}>
                  <td style={{
                    padding: '10px 16px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    color: player.rank === 1 ? '#fbbf24' : player.rank === 2 ? '#9ca3af' : player.rank === 3 ? '#ea580c' : '#f8fafc',
                    borderBottom: '1px solid #475569',
                  }}>
                    {player.rank <= 3 ? '🏆 ' : ''}{player.rank}
                  </td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isValidAvatarUrl(player.avatar) ? (
                        <img
                          src={normalizeAvatarSrc(player.avatar)!}
                          alt=""
                          crossOrigin="anonymous"
                          style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid #475569', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}>
                          {player.firstName[0]}{player.lastName[0]}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: '500' }}>
                          {player.firstName} {player.lastName}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          @{player.nickname}
                        </span>
                      </div>
                      {player.eliminationsCount > 0 && (
                        <span style={{ marginLeft: '4px', fontSize: '12px', color: '#f87171' }}>
                          🔪 {player.eliminationsCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#86efac', borderBottom: '1px solid #475569' }}>{player.rankPoints}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#60a5fa', borderBottom: '1px solid #475569' }}>{player.eliminationPoints}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#60a5fa', borderBottom: '1px solid #475569' }}>{player.bonusPoints}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: player.penaltyPoints < 0 ? '#f87171' : '#94a3b8', borderBottom: '1px solid #475569' }}>
                    {player.penaltyPoints !== 0 ? player.penaltyPoints : '-'}
                  </td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fde047', borderBottom: '1px solid #475569' }}>{player.totalPoints}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '14px', color: '#4ade80', fontWeight: player.prizeAmount ? 'bold' : 'normal', borderBottom: '1px solid #475569' }}>
                    {player.prizeAmount !== null && player.prizeAmount > 0 ? `${player.prizeAmount}€` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
