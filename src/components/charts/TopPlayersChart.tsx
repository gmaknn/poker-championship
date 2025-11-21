'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/components/providers/ThemeProvider';

interface TopPlayer {
  id: string;
  name: string;
  nickname: string;
  avatar: string | null;
  tournamentsPlayed: number;
  lastTournament: string | null;
}

interface TopPlayersChartProps {
  data: TopPlayer[];
}

export function TopPlayersChart({ data }: TopPlayersChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = data.map((player, index) => ({
    name: player.nickname,
    tournois: player.tournamentsPlayed,
    rank: index + 1,
    fullName: player.name
  }));

  const colors = {
    bars: [
      '#fbbf24', // Gold for #1
      '#9ca3af', // Silver for #2
      '#f97316', // Bronze for #3
      isDark ? '#60a5fa' : '#3b82f6', // Blue for others
      isDark ? '#60a5fa' : '#3b82f6'
    ],
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
      const data = payload[0].payload;
      return (
        <div
          className="rounded-lg border p-3 shadow-lg"
          style={{
            backgroundColor: colors.tooltip.bg,
            borderColor: colors.tooltip.border,
            color: colors.tooltip.text
          }}
        >
          <p className="font-semibold">#{data.rank} {data.fullName}</p>
          <p className="text-sm text-muted-foreground">@{data.name}</p>
          <p className="text-sm font-bold mt-1">
            {data.tournois} tournois joués
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
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          type="number"
          stroke={colors.text}
          tick={{ fill: colors.text }}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke={colors.text}
          tick={{ fill: colors.text }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="tournois"
          radius={[0, 8, 8, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors.bars[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
