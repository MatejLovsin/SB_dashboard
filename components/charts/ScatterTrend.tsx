'use client';

import {
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { chartAnim, tooltipStyle, useChartTheme, type ChartTheme } from '@/lib/utils/chartTheme';

export interface ScatterTrendPoint {
  x: number; // hours studied
  y: number; // grade (0-100)
  difficulty: number; // 1-5
  label: string; // exam title / subject name, for tooltip
}

export interface ScatterTrendLine {
  difficulty: number; // 1-5, which color this line matches
  points: { x: number; y: number }[]; // exactly 2 points (start/end) tracing a straight line
}

interface ScatterTrendProps {
  data: ScatterTrendPoint[];
  trendLines?: ScatterTrendLine[];
  height?: number;
  xLabel?: string; // axis label, e.g. "Hours studied"
  yLabel?: string; // e.g. "Grade %"
}

function clampDifficulty(d: number): number {
  return Math.min(5, Math.max(1, Math.round(d)));
}

// A same-hue 6-step ramp (theme.scale) puts 3-4-5 within one perceptual step of each
// other — indistinguishable as small dots. Spread difficulty across neutral greys for
// "easy" and the section accent for "hard", capping at the foreground color (near-white
// on this app's dark surfaces) so the hardest tier reads as a clear high-contrast outlier
// no matter which section's hue is active.
export function difficultyColor(theme: ChartTheme, difficulty: number): string {
  switch (clampDifficulty(difficulty)) {
    case 1:
      return '#52525b';
    case 2:
      return '#a1a1aa';
    case 3:
      return theme.accent;
    case 4:
      return theme.scale[5];
    default:
      return theme.foreground;
  }
}

/** Scatter plot of grade vs. hours studied, colored by difficulty, with optional trend lines. */
export function ScatterTrend({ data, trendLines = [], height = 240, xLabel, yLabel }: ScatterTrendProps) {
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
    <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0} debounce={1}>
      <ComposedChart margin={{ top: 8, right: 4, bottom: xLabel ? 16 : 0, left: -16 }}>
        <CartesianGrid stroke={theme.border} strokeOpacity={0.6} />
        <XAxis
          type="number"
          dataKey="x"
          name="Hours studied"
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -8, fontSize: 11, fill: theme.muted } : undefined}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Grade"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: theme.muted }}
          tickLine={false}
          axisLine={false}
          width={48}
          label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: theme.muted } : undefined}
        />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: theme.muted }}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;
            const p = payload[0].payload as ScatterTrendPoint;
            if (p.label === undefined) return null;
            return (
              <div style={tooltipStyle(theme)} className="px-3 py-2">
                <div className="font-medium">{p.label}</div>
                <div style={{ color: theme.muted }}>{p.x}h studied</div>
                <div style={{ color: theme.muted }}>{p.y}% grade</div>
                <div style={{ color: theme.muted }}>Difficulty {p.difficulty}</div>
              </div>
            );
          }}
        />
        <Scatter data={data} {...chartAnim}>
          {data.map((d, i) => (
            <Cell key={i} fill={difficultyColor(theme, d.difficulty)} />
          ))}
        </Scatter>
        {trendLines.map((line) => (
          <Line
            key={line.difficulty}
            type="linear"
            dataKey="y"
            data={line.points}
            stroke={difficultyColor(theme, line.difficulty)}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
