'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart, Bar } from 'recharts';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';
import type { CardioActivityHistoryPoint } from '@/lib/queries/cardio';

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  data: CardioActivityHistoryPoint[];
}

// RPE (1-10) per session, oldest → newest.
export function IntensityTrendChart({ data }: Props) {
  const theme = useChartTheme();
  const chartData = data.map((p) => ({ date: shortDate(p.performedAt), intensity: p.entry.intensity }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
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
          domain={[0, 10]}
        />
        <Tooltip
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [`${v}/10`, 'RPE']}
        />
        <Line
          type="monotone"
          dataKey="intensity"
          stroke={theme.accent}
          strokeWidth={2.5}
          dot={{ r: 3, fill: theme.accent, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Duration (minutes) per session, oldest → newest.
export function DurationTrendChart({ data }: Props) {
  const theme = useChartTheme();
  const chartData = data.map((p) => ({
    date: shortDate(p.performedAt),
    duration: Math.round(Number(p.entry.duration_minutes)),
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
        <YAxis tick={{ fontSize: 11, fill: theme.muted }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: theme.accent, fillOpacity: 0.08 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [`${v} min`, 'Duration']}
        />
        <Bar dataKey="duration" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
