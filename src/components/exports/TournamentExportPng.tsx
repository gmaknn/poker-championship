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
            style={{ width: '120px', height: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Contenu principal - Fond clair */}
      <div style={{ padding: '32px 40px', backgroundColor: '#f8fafc' }}>
        {/* Prize Pool Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginBottom: '32px',
          padding: '16px 32px',
          background: 'linear-gradient(90deg, rgba(202,138,4,0.05) 0%, rgba(202,138,4,0.15) 50%, rgba(202,138,4,0.05) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(202,138,4,0.3)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buy-in</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ca8a04' }}>{buyInAmount}€</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recaves</div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ca8a04' }}>{totalRebuys}</div>
          </div>
          {prizePool !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prize Pool</div>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ca8a04' }}>{prizePool}€</div>
            </div>
          )}
        </div>

        {/* Podium Top 3 */}
        {top3.length >= 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '60px', marginBottom: '40px' }}>
            {/* 2eme */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(top3[1].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[1].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #64748b', objectFit: 'cover', backgroundColor: '#e2e8f0' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #64748b', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#64748b' }}>
                  {top3[1].firstName[0]}{top3[1].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#64748b' }}>🥈 2</div>
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '18px' }}>{top3[1].firstName} {top3[1].lastName}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>@{top3[1].nickname}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#64748b' }}>{top3[1].totalPoints} pts</div>
              </div>
            </div>

            {/* 1er */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '4px' }}>🏆</div>
              {isValidAvatarUrl(top3[0].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[0].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #ca8a04', objectFit: 'cover', backgroundColor: '#fef3c7' }}
                />
              ) : (
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #ca8a04', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#ca8a04' }}>
                  {top3[0].firstName[0]}{top3[0].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#ca8a04' }}>🥇 1</div>
                <div style={{ fontWeight: 'bold', fontSize: '22px', color: '#1e293b' }}>{top3[0].firstName} {top3[0].lastName}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>@{top3[0].nickname}</div>
                <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#ca8a04' }}>{top3[0].totalPoints} pts</div>
              </div>
            </div>

            {/* 3eme */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isValidAvatarUrl(top3[2].avatar) ? (
                <img
                  src={normalizeAvatarSrc(top3[2].avatar)!}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #c2410c', objectFit: 'cover', backgroundColor: '#fed7aa' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '8px', border: '4px solid #c2410c', backgroundColor: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', color: '#c2410c' }}>
                  {top3[2].firstName[0]}{top3[2].lastName[0]}
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#c2410c' }}>🥉 3</div>
                <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '18px' }}>{top3[2].firstName} {top3[2].lastName}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>@{top3[2].nickname}</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c' }}>{top3[2].totalPoints} pts</div>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#e2e8f0' }}>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>#</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>Joueur</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#16a34a', fontSize: '15px', fontWeight: '600' }}>Classement</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#2563eb', fontSize: '15px', fontWeight: '600' }}>Elim.</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#2563eb', fontSize: '15px', fontWeight: '600' }}>Bonus</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#dc2626', fontSize: '15px', fontWeight: '600' }}>Penalites</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#ca8a04', fontSize: '15px', fontWeight: '600' }}>Total</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#16a34a', fontSize: '15px', fontWeight: '600' }}>Gains</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isTop3 = player.rank <= 3;

              let bgColor: string;
              let borderLeft: string | undefined;

              if (isTop3) {
                bgColor = 'rgba(250,204,21,0.15)';
                borderLeft = '3px solid #ca8a04';
              } else {
                bgColor = index % 2 === 0 ? '#ffffff' : '#f1f5f9';
                borderLeft = undefined;
              }

              return (
                <tr key={player.playerId} style={{ backgroundColor: bgColor, borderLeft }}>
                  <td style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: player.rank === 1 ? '#ca8a04' : player.rank === 2 ? '#64748b' : player.rank === 3 ? '#c2410c' : '#1e293b',
                    borderBottom: '1px solid #cbd5e1',
                  }}>
                    {player.rank <= 3 ? '🏆 ' : ''}{player.rank}
                  </td>
                  <td style={{ padding: '12px 20px', borderBottom: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isValidAvatarUrl(player.avatar) ? (
                        <img
                          src={normalizeAvatarSrc(player.avatar)!}
                          alt=""
                          crossOrigin="anonymous"
                          style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #cbd5e1', objectFit: 'cover', backgroundColor: '#e2e8f0' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #cbd5e1', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#64748b' }}>
                          {player.firstName[0]}{player.lastName[0]}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', color: '#1e293b', fontWeight: '500' }}>
                          {player.firstName} {player.lastName}
                        </span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          @{player.nickname}
                        </span>
                      </div>
                      {player.eliminationsCount > 0 && (
                        <span style={{ marginLeft: '4px', fontSize: '14px', color: '#dc2626' }}>
                          🔪 {player.eliminationsCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '18px', color: '#16a34a', borderBottom: '1px solid #cbd5e1' }}>{player.rankPoints}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '18px', color: '#2563eb', borderBottom: '1px solid #cbd5e1' }}>{player.eliminationPoints}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '18px', color: '#2563eb', borderBottom: '1px solid #cbd5e1' }}>{player.bonusPoints}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '18px', color: player.penaltyPoints < 0 ? '#dc2626' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>
                    {player.penaltyPoints !== 0 ? player.penaltyPoints : '-'}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 'bold', fontSize: '20px', color: '#ca8a04', borderBottom: '1px solid #cbd5e1' }}>{player.totalPoints}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontSize: '18px', color: '#16a34a', fontWeight: player.prizeAmount ? 'bold' : 'normal', borderBottom: '1px solid #cbd5e1' }}>
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
