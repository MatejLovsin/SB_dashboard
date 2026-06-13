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
import type { StudySession } from '@/lib/db/types';

interface Props {
  sessions: StudySession[];
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function StudySessionsChart({ sessions }: Props) {
  const theme = useChartTheme();

  // sessions arrive newest-first; take up to 30 most recent, then reverse for chronological display
  const chartData = sessions
    .slice(0, 30)
    .reverse()
    .map((s) => ({
      date: shortDate(s.started_at),
      minutes: Math.round(s.duration_seconds / 60),
    }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}m`}
        />
        <Tooltip
          cursor={{ fill: theme.accent, fillOpacity: 0.08 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [v != null ? `${v} min` : '—', 'Duration']}
        />
        <Bar dataKey="minutes" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
