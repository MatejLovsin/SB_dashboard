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
import type { StudySession } from '@/lib/db/types';

interface Props {
  sessions: StudySession[];
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function StudySessionsChart({ sessions }: Props) {
  const [accent] = useState(() => readVar('--accent', '#4f46e5'));
  const [muted] = useState(() => readVar('--muted', '#737373'));

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
          tickFormatter={(v: number) => `${v}m`}
        />
        <Tooltip
          cursor={{ fill: accent, fillOpacity: 0.08 }}
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          formatter={(v) => [v != null ? `${v} min` : '—', 'Duration']}
        />
        <Bar dataKey="minutes" fill={accent} fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
