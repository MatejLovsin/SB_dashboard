'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { bestSetE1RM } from '@/lib/utils/stats';
import { useChartTheme, type ChartTheme } from '@/lib/utils/chartTheme';
import { emphasisFor, hasLightSplit, mainSeries, splitE1RM } from '@/lib/utils/emphasis';
import { StrengthTooltip, type StrengthPoint } from './StrengthTooltip';
import type { ExerciseSessionPoint } from '@/lib/queries/analytics';

interface Props {
  data: ExerciseSessionPoint[];
  exerciseId: string;
  highlightSessionId?: string;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Drawn per point rather than as a `dot` prop object so the session being viewed
// can be enlarged. Returns an empty node for the series this point isn't in —
// otherwise Recharts renders a dot at y=0 for every null.
function seriesDot(color: string, theme: ChartTheme, highlightSessionId?: string) {
  return function Dot(props: { cx?: number; cy?: number; value?: number | null; payload?: StrengthPoint }) {
    const { cx, cy, value, payload } = props;
    if (cx == null || cy == null || value == null) return <></>;
    const isHighlight = highlightSessionId != null && payload?.sessionId === highlightSessionId;
    return (
      <circle
        key={`${color}-${payload?.sessionId}`}
        cx={cx}
        cy={cy}
        r={isHighlight ? 6 : 3}
        fill={color}
        stroke={isHighlight ? theme.surface : undefined}
        strokeWidth={isHighlight ? 2 : 0}
      />
    );
  };
}

export function StrengthTrendChart({ data, exerciseId, highlightSessionId }: Props) {
  const theme = useChartTheme();

  const chartData: StrengthPoint[] = data.map((p) => {
    const e1rm = Math.round(bestSetE1RM(p.sets));
    const emphasis = emphasisFor(p.session.emphasis, exerciseId);
    return {
      date: shortDate(p.session.performed_at),
      ...splitE1RM(e1rm, emphasis),
      e1rm,
      emphasis,
      sessionId: p.session.id,
      sets: p.sets,
    };
  });

  // The peak worth chasing is a heavy-day peak; a light day can never set it,
  // but the line should not claim to either.
  const heavy = mainSeries(chartData);
  const peak = heavy.length > 0 ? Math.max(...heavy.map((d) => d.e1rm)) : undefined;
  const split = hasLightSplit(chartData);

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.6} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: theme.muted }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.muted }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<StrengthTooltip theme={theme} />} />
          {peak !== undefined && (
            <ReferenceLine y={peak} stroke={theme.accent} strokeOpacity={0.3} strokeDasharray="4 4" />
          )}
          {split && (
            <Line
              type="monotone"
              dataKey="light"
              stroke={theme.loadLight}
              strokeWidth={1.5}
              strokeOpacity={0.55}
              dot={seriesDot(theme.loadLight, theme, highlightSessionId)}
              activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
              connectNulls
            />
          )}
          <Line
            type="monotone"
            dataKey={split ? 'main' : 'e1rm'}
            stroke={theme.accent}
            strokeWidth={2.5}
            dot={seriesDot(theme.accent, theme, highlightSessionId)}
            activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {split && (
        <div className="mt-1 flex items-center gap-4 pl-1 text-[11px]" style={{ color: theme.muted }}>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4" style={{ background: theme.accent }} />
            Heavy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4" style={{ background: theme.loadLight, opacity: 0.55 }} />
            Light
          </span>
        </div>
      )}
    </div>
  );
}
