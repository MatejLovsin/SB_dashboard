'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { WeekBucket } from '@/lib/utils/stats';

interface Props {
  data: WeekBucket[];
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function shortWeek(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function SessionsPerWeekChart({ data }: Props) {
  const [accent] = useState(() => readVar('--accent', '#4f46e5'));
  const [muted] = useState(() => readVar('--muted', '#737373'));

  const chartData = data.map((b) => ({ week: shortWeek(b.weekStart), count: b.count }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid vertical={false} stroke={muted} strokeOpacity={0.2} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: muted }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: muted }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: accent, fillOpacity: 0.08 }}
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          formatter={(v) => [v ?? 0, 'sessions']}
        />
        <Bar dataKey="count" fill={accent} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
