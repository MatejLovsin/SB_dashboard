'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartAnim, tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';

export interface CompletionBarPoint {
  label: string;
  completed: number;
  failed: number;
}

interface CompletionBarsProps {
  data: CompletionBarPoint[];
  height?: number;
}

/** Stacked bar: completed (accent) on bottom, failed (red) on top. */
export function CompletionBars({ data, height = 200 }: CompletionBarsProps) {
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

  return (
    <ResponsiveContainer width="100%" height={height} debounce={1}>
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
          allowDecimals={false}
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ fill: theme.accent, fillOpacity: 0.08 }}
          contentStyle={tooltipStyle(theme)}
          labelStyle={{ color: theme.muted }}
        />
        <Bar
          {...chartAnim}
          dataKey="completed"
          name="Completed"
          stackId="a"
          fill={theme.accent}
          radius={[0, 0, 0, 0]}
          maxBarSize={36}
        />
        <Bar
          {...chartAnim}
          dataKey="failed"
          name="Failed"
          stackId="a"
          fill="#ef4444"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
