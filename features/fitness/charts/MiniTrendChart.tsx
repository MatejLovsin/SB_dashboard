'use client';

import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { useChartTheme } from '@/lib/utils/chartTheme';
import { mainSeries } from '@/lib/utils/emphasis';
import type { PinnedLiftPoint } from '@/lib/queries/analytics';

interface Props {
  points: PinnedLiftPoint[];
  height?: number;
}

// Axis-free est-1RM sparkline for the pinned-lift tiles on the Fitness hub.
// Light days are dropped rather than drawn as a second line — at 48px there is
// no room for a legend, and a mixed line here is the zigzag this whole split
// exists to remove. Falls back to every point when nothing is classified.
export function MiniTrendChart({ points, height = 48 }: Props) {
  const theme = useChartTheme();
  const main = mainSeries(points);
  const series = main.length > 1 ? main : points;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke={theme.accent}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
