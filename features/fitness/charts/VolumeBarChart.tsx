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
import { totalVolume } from '@/lib/utils/stats';
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

export function VolumeBarChart({ data }: Props) {
  const [accent] = useState(() => readVar('--accent', '#4f46e5'));
  const [muted] = useState(() => readVar('--muted', '#737373'));

  const chartData = data.map((p) => ({
    date: shortDate(p.session.performed_at),
    volume: totalVolume(p.sets),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
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
          tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip
          cursor={{ fill: accent, fillOpacity: 0.08 }}
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          formatter={(v) => [v != null ? `${v} kg` : '—', 'Volume']}
        />
        <Bar dataKey="volume" fill={accent} fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
