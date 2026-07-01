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
import { bestSetE1RM, estimatedOneRepMax, type SetLike } from '@/lib/utils/stats';
import { tooltipStyle, useChartTheme, type ChartTheme } from '@/lib/utils/chartTheme';
import type { ExerciseSessionPoint } from '@/lib/queries/analytics';
import type { SessionSet } from '@/lib/db/types';

interface Props {
  data: ExerciseSessionPoint[];
  highlightSessionId?: string;
}

type ChartPoint = {
  date: string;
  e1rm: number;
  sessionId: string;
  sets: SessionSet[];
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function bestSetIndex(sets: SetLike[]): number {
  let bestIdx = -1;
  let best = 0;
  sets.forEach((s, i) => {
    if (!s.completed || s.reps == null || s.weight == null) return;
    const e = estimatedOneRepMax(s.weight, s.reps);
    if (e > best) {
      best = e;
      bestIdx = i;
    }
  });
  return bestIdx;
}

function StrengthTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  theme: ChartTheme;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const bestIdx = bestSetIndex(point.sets);

  return (
    <div style={tooltipStyle(theme)} className="px-3 py-2">
      <p className="mb-1" style={{ color: theme.muted }}>
        {point.date}
      </p>
      <ul className="space-y-0.5">
        {point.sets.map((s, i) => (
          <li
            key={s.id}
            className={
              s.completed
                ? i === bestIdx
                  ? 'font-semibold'
                  : 'text-foreground/90'
                : 'text-foreground/50 line-through'
            }
            style={s.completed && i === bestIdx ? { color: theme.accent } : undefined}
          >
            {s.weight ?? '—'} kg × {s.reps ?? '—'}
          </li>
        ))}
      </ul>
      <p className="mt-1" style={{ color: theme.muted }}>
        Est. 1RM: {point.e1rm ? `${point.e1rm} kg` : '—'}
      </p>
    </div>
  );
}

export function StrengthTrendChart({ data, highlightSessionId }: Props) {
  const theme = useChartTheme();

  const chartData: ChartPoint[] = data.map((p) => ({
    date: shortDate(p.session.performed_at),
    e1rm: Math.round(bestSetE1RM(p.sets)),
    sessionId: p.session.id,
    sets: p.sets,
  }));
  const peak = chartData.length > 0 ? Math.max(...chartData.map((d) => d.e1rm)) : undefined;

  return (
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
        <Line
          type="monotone"
          dataKey="e1rm"
          stroke={theme.accent}
          strokeWidth={2.5}
          dot={(props: { cx?: number; cy?: number; payload?: ChartPoint }) => {
            const { cx, cy, payload } = props;
            if (cx == null || cy == null) return <></>;
            const isHighlight =
              highlightSessionId != null && payload?.sessionId === highlightSessionId;
            return isHighlight ? (
              <circle
                key={`dot-${payload?.sessionId}`}
                cx={cx}
                cy={cy}
                r={6}
                fill={theme.accent}
                stroke={theme.surface}
                strokeWidth={2}
              />
            ) : (
              <circle
                key={`dot-${payload?.sessionId}`}
                cx={cx}
                cy={cy}
                r={3}
                fill={theme.accent}
                strokeWidth={0}
              />
            );
          }}
          activeDot={{ r: 5, stroke: theme.surface, strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
