'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';

export interface AreaTrendPoint {
  /** X-axis label (already formatted, e.g. "May 04"). */
  label: string;
  value: number;
}

interface AreaTrendProps {
  data: AreaTrendPoint[];
  height?: number;
  /**
   * Use compact number formatting (1.2K, 1.5M).
   * Pass this instead of a formatter function so the prop is serializable
   * when passed from a Server Component.
   */
  compact?: boolean;
  /** Unit string appended in the tooltip, e.g. "kg". */
  unit?: string;
  /** Tooltip series name. */
  name?: string;
}

function fmt(v: number, compact?: boolean, unit?: string): string {
  let s: string;
  if (compact) {
    s = v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : v >= 1000
        ? `${(v / 1000).toFixed(1)}K`
        : `${v}`;
  } else {
    s = `${v}`;
  }
  return unit ? `${s} ${unit}` : s;
}

/** The hero gradient area chart — the benchmark's centerpiece. */
export function AreaTrend({
  data,
  height = 240,
  compact,
  unit,
  name = 'value',
}: AreaTrendProps) {
  const theme = useChartTheme();
  const gradientId = useId();
  const glowId = useId();

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted"
        style={{ height }}
      >
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.scale[3]} stopOpacity={0.55} />
            <stop offset="60%" stopColor={theme.scale[3]} stopOpacity={0.15} />
            <stop offset="100%" stopColor={theme.scale[3]} stopOpacity={0} />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => fmt(v, compact)}
        />
        <Tooltip
          cursor={{ stroke: theme.accent, strokeOpacity: 0.4 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [fmt(Number(v), compact, unit), name]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={theme.accent}
          strokeWidth={3}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 5, fill: theme.accent, stroke: theme.surface, strokeWidth: 2 }}
          style={{ filter: `url(#${glowId})` }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
