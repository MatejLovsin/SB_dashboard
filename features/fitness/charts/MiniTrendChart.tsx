'use client';

import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';
import { useChartTheme } from '@/lib/utils/chartTheme';
import type { PinnedLiftPoint } from '@/lib/queries/analytics';

interface Props {
  points: PinnedLiftPoint[];
  height?: number;
}

// Axis-free est-1RM sparkline for the pinned-lift tiles on the Fitness hub.
export function MiniTrendChart({ points, height = 48 }: Props) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
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
