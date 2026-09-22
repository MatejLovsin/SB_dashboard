'use client';

import { estimatedOneRepMax, type SetLike } from '@/lib/utils/stats';
import { tooltipStyle, type ChartTheme } from '@/lib/utils/chartTheme';
import type { Emphasis } from '@/lib/utils/emphasis';
import type { SessionSet } from '@/lib/db/types';

export type StrengthPoint = {
  date: string;
  main: number | null;
  light: number | null;
  e1rm: number;
  emphasis: Emphasis;
  sessionId: string;
  sets: SessionSet[];
};

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

const EMPHASIS_LABEL: Record<'heavy' | 'light', string> = {
  heavy: 'Heavy day',
  light: 'Light day',
};

export function StrengthTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: Array<{ payload: StrengthPoint }>;
  theme: ChartTheme;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const bestIdx = bestSetIndex(point.sets);
  const label = point.emphasis ? EMPHASIS_LABEL[point.emphasis] : null;

  return (
    <div style={tooltipStyle(theme)} className="px-3 py-2">
      <p className="mb-1 flex items-center gap-2" style={{ color: theme.muted }}>
        {point.date}
        {label && (
          <span style={{ color: point.emphasis === 'light' ? theme.loadLight : theme.accent }}>
            {label}
          </span>
        )}
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
