'use client';

import React from 'react';

export type PlayerStatsExportPlayer = {
  rank: number;
  playerId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  totalPoints: number;
  tournamentsCount: number;
  totalRebuys: number;       // Decimal: 0.5 for light rebuy, 1 for full
  totalPenalty: number;
  tableFinals: number;       // Top 9 finishes
  tableFinalsPct: number;    // TF / Tournois * 100
  itm: number;               // In The Money (prizeAmount > 0)
  itmPct: number;            // ITM / Tournois * 100
  top3: number;              // Podiums
  victories: number;         // 1st places
  finalEliminations: number; // Eliminations after rebuy period (same as Top Sharks)
  rebuyBusts: number;        // Times eliminated someone who then rebuyed
  totalBonusPoints: number;  // Bonus points (leader kills, etc.)
  totalLosses: number;       // Buy-in + (Rebuys * rebuy-price)
  totalGains: number;        // Sum of prizeAmount
  balance: number;           // Gains - Losses
};

export type PlayerStatsExportProps = {
  seasonName: string;
  seasonYear: number;
  players: PlayerStatsExportPlayer[];
  tournamentsPlayed: number;
};

export default function PlayerStatsExportPng({
  seasonName,
  seasonYear,
  players,
  tournamentsPlayed,
}: PlayerStatsExportProps) {
  const formatMoney = (amount: number) => {
    if (amount === 0) return '-';
    return `${amount >= 0 ? '' : ''}${amount.toFixed(0)}`;
  };

  const formatBalance = (amount: number) => {
    if (amount === 0) return '-';
    const prefix = amount > 0 ? '+' : '';
    return `${prefix}${amount.toFixed(0)}`;
  };

  const formatPct = (pct: number) => {
    if (pct === 0) return '-';
    return `${pct.toFixed(0)}%`;
  };

  // Format rebuys: show decimal only if not a whole number
  const formatRebuys = (rebuys: number) => {
    if (rebuys === 0) return '-';
    return Number.isInteger(rebuys) ? rebuys.toString() : rebuys.toFixed(1);
  };

  return (
    <div
      id="player-stats-export-png"
      style={{
        width: '100%',
        minWidth: '1400px',
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
            Stats Joueurs - Saison {seasonYear}
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
      <div style={{ padding: '24px 20px', backgroundColor: '#f8fafc' }}>
        {/* Legend */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          fontSize: '11px',
          color: '#64748b',
        }}>
          <span><strong>Rec</strong> = Recaves (0.5 = light, 1 = full)</span>
          <span><strong>TF</strong> = Table Finale (Top 9)</span>
          <span><strong>ITM</strong> = In The Money</span>
          <span><strong>Top3</strong> = Podiums</span>
          <span><strong>Elim.</strong> = Eliminations finales</span>
          <span><strong>@Reb</strong> = Elim. au rebuy</span>
          <span><strong>Bonus</strong> = Points bonus</span>
          <span><strong>Mises</strong> = Buy-in + Recaves</span>
          <span><strong>Bilan</strong> = Gains - Mises</span>
        </div>

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
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', minWidth: '40px' }}>#</th>
              <th style={{ padding: '14px 12px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', minWidth: '160px' }}>Joueur</th>
              <th style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#ca8a04', fontSize: '14px', fontWeight: '600', minWidth: '60px' }}>Points</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', minWidth: '35px' }}>T</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', minWidth: '35px' }}>Rec</th>
              <th style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#dc2626', fontSize: '14px', fontWeight: '600', minWidth: '50px' }}>Malus</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#2563eb', fontSize: '14px', fontWeight: '600', minWidth: '35px' }}>TF</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#2563eb', fontSize: '14px', fontWeight: '600', minWidth: '45px' }}>%TF</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#16a34a', fontSize: '14px', fontWeight: '600', minWidth: '35px' }}>ITM</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#16a34a', fontSize: '14px', fontWeight: '600', minWidth: '45px' }}>%ITM</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#ca8a04', fontSize: '14px', fontWeight: '600', minWidth: '40px' }}>Top3</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#ca8a04', fontSize: '14px', fontWeight: '600', minWidth: '30px' }}>V</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#dc2626', fontSize: '14px', fontWeight: '600', minWidth: '45px' }}>Elim.</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#9333ea', fontSize: '14px', fontWeight: '600', minWidth: '45px' }}>@Reb</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', color: '#7c3aed', fontSize: '14px', fontWeight: '600', minWidth: '50px' }}>Bonus</th>
              <th style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#dc2626', fontSize: '14px', fontWeight: '600', minWidth: '60px' }}>Mises</th>
              <th style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#16a34a', fontSize: '14px', fontWeight: '600', minWidth: '60px' }}>Gains</th>
              <th style={{ padding: '14px 12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#1e293b', fontSize: '14px', fontWeight: '600', minWidth: '65px' }}>Bilan</th>
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

              const balanceColor = entry.balance > 0 ? '#16a34a' : entry.balance < 0 ? '#dc2626' : '#64748b';

              return (
                <React.Fragment key={entry.playerId}>
                  {entry.rank === 11 && (
                    <tr>
                      <td colSpan={18} style={{ padding: '0', height: '2px', backgroundColor: '#ca8a04' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: entry.rank === 1 ? '#ca8a04' : entry.rank === 2 ? '#64748b' : entry.rank === 3 ? '#c2410c' : isTop10 ? '#a16207' : '#1e293b', borderBottom: '1px solid #cbd5e1' }}>
                      {entry.rank <= 3 ? '🏆 ' : entry.rank <= 10 ? '🎖️ ' : ''}{entry.rank}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '18px', color: '#1e293b', fontWeight: '500' }}>
                          {entry.firstName} {entry.lastName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#ca8a04', borderBottom: '1px solid #cbd5e1' }}>{entry.totalPoints}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: '#16a34a', borderBottom: '1px solid #cbd5e1' }}>{entry.tournamentsCount}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.totalRebuys > 0 ? '#ca8a04' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{formatRebuys(entry.totalRebuys)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '18px', color: entry.totalPenalty < 0 ? '#dc2626' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.totalPenalty < 0 ? entry.totalPenalty : '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.tableFinals > 0 ? '#2563eb' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.tableFinals || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '16px', color: entry.tableFinalsPct > 0 ? '#2563eb' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{formatPct(entry.tableFinalsPct)}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.itm > 0 ? '#16a34a' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.itm || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '16px', color: entry.itmPct > 0 ? '#16a34a' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{formatPct(entry.itmPct)}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.top3 > 0 ? '#ca8a04' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.top3 || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.victories > 0 ? '#ca8a04' : '#64748b', fontWeight: entry.victories > 0 ? 'bold' : 'normal', borderBottom: '1px solid #cbd5e1' }}>{entry.victories || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.finalEliminations > 0 ? '#dc2626' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.finalEliminations || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.rebuyBusts > 0 ? '#9333ea' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.rebuyBusts || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '18px', color: entry.totalBonusPoints > 0 ? '#7c3aed' : '#64748b', borderBottom: '1px solid #cbd5e1' }}>{entry.totalBonusPoints || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '18px', color: '#dc2626', borderBottom: '1px solid #cbd5e1' }}>{entry.totalLosses > 0 ? `-${formatMoney(entry.totalLosses)}` : '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '18px', color: '#16a34a', borderBottom: '1px solid #cbd5e1' }}>{entry.totalGains > 0 ? `+${formatMoney(entry.totalGains)}` : '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: balanceColor, borderBottom: '1px solid #cbd5e1' }}>{formatBalance(entry.balance)}</td>
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
          WPT Villelaure - Saison {seasonYear} - Stats Joueurs
        </p>
      </div>
    </div>
  );
}
