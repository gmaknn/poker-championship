'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { useTheme } from '@/components/providers/ThemeProvider';

interface RecentTournament {
  id: string;
  name: string;
  date: string;
  playerCount: number;
  status: string;
}

interface RecentActivityChartProps {
  tournaments: RecentTournament[];
}

export function RecentActivityChart({ tournaments }: RecentActivityChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Take last 5 tournaments
  const recentData = tournaments
    .slice(-5)
    .map(t => ({
      name: new Date(t.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      joueurs: t.playerCount,
      tournoi: t.name,
      status: t.status
    }));

  const colors = {
    FINISHED: isDark ? '#10b981' : '#059669',
    IN_PROGRESS: isDark ? '#f59e0b' : '#d97706',
    default: isDark ? '#60a5fa' : '#3b82f6',
    text: isDark ? '#9ca3af' : '#6b7280',
    tooltip: {
      bg: isDark ? '#1f2937' : '#ffffff',
      border: isDark ? '#374151' : '#e5e7eb',
      text: isDark ? '#f3f4f6' : '#111827'
    }
  };

  const getBarColor = (status: string) => {
    if (status === 'FINISHED') return colors.FINISHED;
    if (status === 'IN_PROGRESS') return colors.IN_PROGRESS;
    return colors.default;
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
          <p className="font-semibold">{data.tournoi}</p>
          <p className="text-sm">{data.name}</p>
          <p className="text-sm font-bold mt-1">
            {data.joueurs} joueurs
          </p>
        </div>
      );
    }
    return null;
  };

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Aucun tournoi récent
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={recentData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <XAxis
          dataKey="name"
          stroke={colors.text}
          tick={{ fill: colors.text, fontSize: 12 }}
        />
        <YAxis
          stroke={colors.text}
          tick={{ fill: colors.text, fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="joueurs" radius={[8, 8, 0, 0]}>
          {recentData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
