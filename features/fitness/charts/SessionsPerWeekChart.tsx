'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';
import type { WeekBucket } from '@/lib/utils/stats';

interface Props {
  data: WeekBucket[];
}

function shortWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function SessionsPerWeekChart({ data }: Props) {
  const theme = useChartTheme();

  const chartData = data.map((b) => ({ week: shortWeek(b.weekStart), count: b.count }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.6} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: theme.accent, fillOpacity: 0.08 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [v ?? 0, 'sessions']}
        />
        <Bar dataKey="count" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
