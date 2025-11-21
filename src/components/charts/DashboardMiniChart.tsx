'use client';

import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '@/components/providers/ThemeProvider';

interface DashboardMiniChartProps {
  data: { value: number }[];
  color?: string;
}

export function DashboardMiniChart({ data, color }: DashboardMiniChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartColor = color || (isDark ? '#60a5fa' : '#3b82f6');
  const fillColor = isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-lg">
          <p className="text-sm font-bold">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={60}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={chartColor}
          fill={`url(#gradient-${color})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
