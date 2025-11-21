'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/components/providers/ThemeProvider';

interface SeasonStat {
  id: string;
  name: string;
  status: string;
  totalTournaments: number;
  finishedTournaments: number;
  totalPlayers: number;
  totalEliminations: number;
  avgPlayersPerTournament: number;
}

interface SeasonComparisonChartProps {
  data: SeasonStat[];
}

export function SeasonComparisonChart({ data }: SeasonComparisonChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = data.map(season => ({
    name: season.name,
    tournois: season.totalTournaments,
    joueurs: season.avgPlayersPerTournament,
    isActive: season.status === 'ACTIVE'
  }));

  const colors = {
    bar1: isDark ? '#60a5fa' : '#3b82f6',
    bar2: isDark ? '#34d399' : '#10b981',
    grid: isDark ? '#374151' : '#e5e7eb',
    text: isDark ? '#9ca3af' : '#6b7280',
    tooltip: {
      bg: isDark ? '#1f2937' : '#ffffff',
      border: isDark ? '#374151' : '#e5e7eb',
      text: isDark ? '#f3f4f6' : '#111827'
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            backgroundColor: colors.tooltip.bg,
            borderColor: colors.tooltip.border,
            color: colors.tooltip.text
          }}
        >
          <p className="font-semibold flex items-center gap-2">
            {payload[0].payload.name}
            {payload[0].payload.isActive && (
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                Active
              </span>
            )}
          </p>
          <p className="text-sm mt-1">
            Tournois: <span className="font-bold">{payload[0].value}</span>
          </p>
          <p className="text-sm">
            Moyenne joueurs: <span className="font-bold">{payload[1].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="name"
          stroke={colors.text}
          tick={{ fill: colors.text }}
        />
        <YAxis
          stroke={colors.text}
          tick={{ fill: colors.text }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: colors.text }}
        />
        <Bar
          dataKey="tournois"
          fill={colors.bar1}
          name="Nombre de tournois"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="joueurs"
          fill={colors.bar2}
          name="Moy. joueurs/tournoi"
          radius={[8, 8, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
