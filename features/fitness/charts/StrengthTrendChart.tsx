'use client';

import { useState } from 'react';
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
import type { ExerciseSessionPoint } from '@/lib/queries/analytics';

interface Props {
  data: ExerciseSessionPoint[];
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function StrengthTrendChart({ data }: Props) {
  const [accent] = useState(() => readVar('--accent', '#4f46e5'));
  const [muted] = useState(() => readVar('--muted', '#737373'));

  const chartData = data.map((p) => ({
    date: shortDate(p.session.performed_at),
    e1rm: Math.round(bestSetE1RM(p.sets)),
  }));
  const peak = chartData.length > 0 ? Math.max(...chartData.map((d) => d.e1rm)) : undefined;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke={muted} strokeOpacity={0.2} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: muted }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: muted }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          formatter={(v) => [v ? `${v} kg` : '—', 'Est. 1RM']}
        />
        {peak !== undefined && (
          <ReferenceLine
            y={peak}
            stroke={accent}
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />
        )}
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke={accent}
          strokeWidth={2}
          dot={{ r: 3, fill: accent, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
