'use client';

import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useChartTheme } from '@/lib/utils/chartTheme';

interface SparklineProps {
  /** Series values, oldest → newest. */
  data: number[];
  height?: number;
}

/** Tiny inline area chart with a blue gradient fill — no axes, for StatTiles. */
export function Sparkline({ data, height = 36 }: SparklineProps) {
  const theme = useChartTheme();
  const gradientId = useId();
  const chartData = data.map((v, i) => ({ i, v }));

  if (data.length < 2) return <div style={{ height }} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={theme.accent}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
