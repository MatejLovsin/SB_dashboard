'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { bestSetE1RM } from '@/lib/utils/stats';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';
import type { ExerciseSessionPoint } from '@/lib/queries/analytics';

interface Props {
  data: ExerciseSessionPoint[];
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function StrengthTrendChart({ data }: Props) {
  const theme = useChartTheme();

  const chartData = data.map((p) => ({
    date: shortDate(p.session.performed_at),
    e1rm: Math.round(bestSetE1RM(p.sets)),
  }));
  const peak = chartData.length > 0 ? Math.max(...chartData.map((d) => d.e1rm)) : undefined;

  return (
    <ResponsiveContainer width="100%" height={180}>
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
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [v ? `${v} kg` : '—', 'Est. 1RM']}
        />
        {peak !== undefined && (
          <ReferenceLine y={peak} stroke={theme.accent} strokeOpacity={0.3} strokeDasharray="4 4" />
        )}
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke={theme.accent}
          strokeWidth={2.5}
          dot={{ r: 3, fill: theme.accent, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
