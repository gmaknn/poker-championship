'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '@/components/providers/ThemeProvider';

interface PlayerTrendData {
  date: string;
  month: string;
  playerCount: number;
  tournamentName: string;
}

interface PlayerTrendChartProps {
  data: PlayerTrendData[];
}

export function PlayerTrendChart({ data }: PlayerTrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = data.map(item => ({
    name: item.month,
    joueurs: item.playerCount,
    tournoi: item.tournamentName
  }));

  // Colors adapted to theme
  const colors = {
    line: isDark ? '#60a5fa' : '#3b82f6',
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
          <p className="font-semibold">{payload[0].payload.tournoi}</p>
          <p className="text-sm">{payload[0].payload.name}</p>
          <p className="text-sm font-bold mt-1">
            {payload[0].value} joueurs
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
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="name"
          stroke={colors.text}
          tick={{ fill: colors.text }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          stroke={colors.text}
          tick={{ fill: colors.text }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: colors.text }}
          formatter={() => 'Nombre de joueurs'}
        />
        <Line
          type="monotone"
          dataKey="joueurs"
          stroke={colors.line}
          strokeWidth={3}
          dot={{ fill: colors.line, r: 5 }}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
