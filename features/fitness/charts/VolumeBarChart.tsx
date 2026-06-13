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
import { totalVolume } from '@/lib/utils/stats';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';
import type { ExerciseSessionPoint } from '@/lib/queries/analytics';

interface Props {
  data: ExerciseSessionPoint[];
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function VolumeBarChart({ data }: Props) {
  const theme = useChartTheme();

  const chartData = data.map((p) => ({
    date: shortDate(p.session.performed_at),
    volume: totalVolume(p.sets),
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
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip
          cursor={{ fill: theme.accent, fillOpacity: 0.08 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [v != null ? `${v} kg` : '—', 'Volume']}
        />
        <Bar dataKey="volume" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
