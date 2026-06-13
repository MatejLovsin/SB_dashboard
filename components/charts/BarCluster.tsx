'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';

export interface BarPoint {
  label: string;
  value: number;
}

interface BarClusterProps {
  data: BarPoint[];
  height?: number;
  /** Compact number formatting (1.2K). Serializable alternative to a formatter fn. */
  compact?: boolean;
  /** Unit appended in tooltip, e.g. "kg". */
  unit?: string;
  /** Tooltip series name. */
  name?: string;
  /** Y-axis integers only (counts). */
  integer?: boolean;
  /**
   * Color each bar by its rank across the blue scale (graded look). Default is
   * a single accent color for all bars.
   */
  graded?: boolean;
}

function fmt(v: number, compact?: boolean, unit?: string): string {
  let s: string;
  if (compact) {
    s = v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`;
  } else {
    s = `${v}`;
  }
  return unit ? `${s} ${unit}` : s;
}

/** Vertical bars — single-accent or graded across the blue scale. */
export function BarCluster({
  data,
  height = 200,
  compact,
  unit,
  name = 'value',
  integer = false,
  graded = false,
}: BarClusterProps) {
  const theme = useChartTheme();

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

  const sorted = [...data].map((d) => d.value).sort((a, b) => a - b);
  const rankColor = (v: number) => {
    if (sorted.length <= 1) return theme.scale[3];
    const rank = sorted.indexOf(v) / (sorted.length - 1);
    const idx = Math.min(theme.scale.length - 1, Math.round(rank * (theme.scale.length - 1)));
    return theme.scale[idx];
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.6} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={16}
        />
        <YAxis
          allowDecimals={!integer}
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v) => fmt(v, compact)}
        />
        <Tooltip
          cursor={{ fill: theme.accent, fillOpacity: 0.08 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
          formatter={(v) => [fmt(Number(v), compact, unit), name]}
        />
        <Bar dataKey="value" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={36}>
          {graded &&
            data.map((d, i) => <Cell key={i} fill={rankColor(d.value)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
