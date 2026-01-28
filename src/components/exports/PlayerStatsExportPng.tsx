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
  totalRebuys: number;
  totalPenalty: number;
  tableFinals: number;       // Top 9 finishes
  tableFinalsPct: number;    // TF / Tournois * 100
  itm: number;               // In The Money (prizeAmount > 0)
  itmPct: number;            // ITM / Tournois * 100
  top3: number;              // Podiums
  victories: number;         // 1st places
  bustsReceived: number;     // Times busted (eliminated)
  totalBonusPoints: number;  // Bonus points (leader kills, etc.)
  totalLosses: number;       // (Tournois * buy-in) + (Recaves * rebuy-price)
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
            style={{ width: '80px', height: 'auto' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Contenu principal - Fond slate */}
      <div style={{ padding: '24px 20px', backgroundColor: '#0f172a' }}>
        {/* Legend */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#94a3b8',
        }}>
          <span><strong>Rec</strong> = Recaves</span>
          <span><strong>TF</strong> = Table Finale (Top 9)</span>
          <span><strong>ITM</strong> = In The Money</span>
          <span><strong>Top3</strong> = Podiums</span>
          <span><strong>Busts</strong> = Eliminations subies</span>
          <span><strong>Bonus</strong> = Points bonus (leader kills...)</span>
          <span><strong>Pertes</strong> = Buy-ins + Recaves</span>
          <span><strong>Bilan</strong> = Gains - Pertes</span>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#334155' }}>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '11px', fontWeight: '600', minWidth: '35px' }}>#</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '11px', fontWeight: '600', minWidth: '140px' }}>Joueur</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#fde047', fontSize: '11px', fontWeight: '600', minWidth: '55px' }}>Points</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '11px', fontWeight: '600', minWidth: '30px' }}>T</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '11px', fontWeight: '600', minWidth: '30px' }}>Rec</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#f87171', fontSize: '11px', fontWeight: '600', minWidth: '45px' }}>Malus</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#60a5fa', fontSize: '11px', fontWeight: '600', minWidth: '30px' }}>TF</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#60a5fa', fontSize: '11px', fontWeight: '600', minWidth: '40px' }}>%TF</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#4ade80', fontSize: '11px', fontWeight: '600', minWidth: '30px' }}>ITM</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#4ade80', fontSize: '11px', fontWeight: '600', minWidth: '40px' }}>%ITM</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#fbbf24', fontSize: '11px', fontWeight: '600', minWidth: '35px' }}>Top3</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#fbbf24', fontSize: '11px', fontWeight: '600', minWidth: '25px' }}>V</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#f87171', fontSize: '11px', fontWeight: '600', minWidth: '40px' }}>Busts</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #475569', color: '#a78bfa', fontSize: '11px', fontWeight: '600', minWidth: '45px' }}>Bonus</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#f87171', fontSize: '11px', fontWeight: '600', minWidth: '55px' }}>Pertes</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#4ade80', fontSize: '11px', fontWeight: '600', minWidth: '55px' }}>Gains</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #475569', color: '#f8fafc', fontSize: '11px', fontWeight: '600', minWidth: '60px' }}>Bilan</th>
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

              const balanceColor = entry.balance > 0 ? '#4ade80' : entry.balance < 0 ? '#f87171' : '#94a3b8';

              return (
                <React.Fragment key={entry.playerId}>
                  {entry.rank === 11 && (
                    <tr>
                      <td colSpan={17} style={{ padding: '0', height: '2px', backgroundColor: '#fbbf24' }} />
                    </tr>
                  )}
                  <tr style={{ backgroundColor: bgColor, borderLeft }}>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', color: entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#ea580c' : isTop10 ? '#fde68a' : '#f8fafc', borderBottom: '1px solid #475569' }}>
                      {entry.rank <= 3 ? (entry.rank === 1 ? '1' : entry.rank === 2 ? '2' : '3') : entry.rank}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #475569' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12px', color: '#f8fafc', fontWeight: '500' }}>
                          {entry.firstName} {entry.lastName}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#fde047', borderBottom: '1px solid #475569' }}>{entry.totalPoints}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: '#86efac', borderBottom: '1px solid #475569' }}>{entry.tournamentsCount}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.totalRebuys > 0 ? '#fbbf24' : '#64748b', borderBottom: '1px solid #475569' }}>{formatRebuys(entry.totalRebuys)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', color: entry.totalPenalty < 0 ? '#f87171' : '#64748b', borderBottom: '1px solid #475569' }}>{entry.totalPenalty < 0 ? entry.totalPenalty : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.tableFinals > 0 ? '#60a5fa' : '#64748b', borderBottom: '1px solid #475569' }}>{entry.tableFinals || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: entry.tableFinalsPct > 0 ? '#60a5fa' : '#64748b', borderBottom: '1px solid #475569' }}>{formatPct(entry.tableFinalsPct)}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.itm > 0 ? '#4ade80' : '#64748b', borderBottom: '1px solid #475569' }}>{entry.itm || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: entry.itmPct > 0 ? '#4ade80' : '#64748b', borderBottom: '1px solid #475569' }}>{formatPct(entry.itmPct)}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.top3 > 0 ? '#fbbf24' : '#64748b', borderBottom: '1px solid #475569' }}>{entry.top3 || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.victories > 0 ? '#fbbf24' : '#64748b', fontWeight: entry.victories > 0 ? 'bold' : 'normal', borderBottom: '1px solid #475569' }}>{entry.victories || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.bustsReceived > 0 ? '#f87171' : '#64748b', borderBottom: '1px solid #475569' }}>{entry.bustsReceived || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '12px', color: entry.totalBonusPoints > 0 ? '#a78bfa' : '#64748b', borderBottom: '1px solid #475569' }}>{entry.totalBonusPoints || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: '#f87171', borderBottom: '1px solid #475569' }}>{entry.totalLosses > 0 ? `-${formatMoney(entry.totalLosses)}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px', color: '#4ade80', borderBottom: '1px solid #475569' }}>{entry.totalGains > 0 ? `+${formatMoney(entry.totalGains)}` : '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: balanceColor, borderBottom: '1px solid #475569' }}>{formatBalance(entry.balance)}</td>
                  </tr>
                </React.Fragment>
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
          WPT Villelaure - Saison {seasonYear} - Stats Joueurs
        </p>
      </div>
    </div>
  );
}
