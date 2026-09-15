'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Geometry, Notch } from '@/components/ui/goalBarGeometry';

export type NodeState = 'hit' | 'next' | 'skipped' | 'future';

interface GoalTimelineProps {
  geo: Geometry;
  stateOf: (notch: Notch) => NodeState;
  /** Caption under each node — the value on a numeric goal, the step number otherwise. */
  captionOf: (notch: Notch) => string;
  startCap: ReactNode;
  targetCap: ReactNode;
  /** The node that was just ticked, so it can light up once. */
  unlocked: string | null;
  /** Manual goals only. */
  onToggle?: (notch: Notch) => void;
}

/** Closest two captions may sit before the later one is dropped (fraction of the rail). */
const CAPTION_GAP = 0.065;

/**
 * The close-up of a goal's bar, for the detail overlay. Same geometry as the
 * card's GoalBar, drawn at reading scale: a thicker lit rail, real nodes instead
 * of hairline notches, and the next milestone breathing so the eye lands on it.
 */
export function GoalTimeline({
  geo,
  stateOf,
  captionOf,
  startCap,
  targetCap,
  unlocked,
  onToggle,
}: GoalTimelineProps) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const fill = drawn ? geo.fillPct : 0;

  return (
    <div className="px-1">
      <div className="relative h-12">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
        <div
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent"
          style={{
            width: `${fill * 100}%`,
            boxShadow: '0 0 14px rgba(var(--accent-rgb), 0.45)',
            transition: 'width var(--dur-slow) var(--ease-out-quint)',
          }}
        />

        {/* After a slip, where you actually are now — distinct from the fill, which holds at your best. */}
        {geo.slipped && geo.currentPct != null ? (
          <div
            className="absolute inset-y-1 w-px -translate-x-1/2 bg-muted"
            style={{ left: `${geo.currentPct * 100}%` }}
          >
            <span className="label absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] text-muted">
              now
            </span>
          </div>
        ) : null}

        {geo.notches.map((n) => {
          const node = <Node state={stateOf(n)} unlocked={unlocked === n.id} />;
          const place = 'absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full';
          return onToggle ? (
            <button
              key={n.id}
              type="button"
              onClick={() => onToggle(n)}
              aria-pressed={n.hit}
              aria-label={`${n.caption}${n.hit ? ' — cleared' : ''}`}
              className={`${place} cursor-pointer`}
              style={{ left: `${n.pct * 100}%` }}
            >
              {node}
            </button>
          ) : (
            <div key={n.id} className={place} style={{ left: `${n.pct * 100}%` }}>
              {node}
            </div>
          );
        })}
      </div>

      <Captions notches={geo.notches} stateOf={stateOf} captionOf={captionOf} />

      <div className="mt-2 flex items-baseline justify-between gap-2 text-muted">
        <span className="nums text-[11px] opacity-70">{startCap}</span>
        <span className={`nums text-[11px] ${geo.fillPct >= 1 ? 'text-accent' : 'opacity-70'}`}>
          {targetCap}
        </span>
      </div>
    </div>
  );
}

function Captions({
  notches,
  stateOf,
  captionOf,
}: Pick<GoalTimelineProps, 'stateOf' | 'captionOf'> & { notches: Notch[] }) {
  const shown = visibleCaptions(notches, stateOf);
  return (
    <div className="relative h-4">
      {notches.map((n) =>
        shown.has(n.id) ? (
          <span
            key={n.id}
            className={`nums absolute -translate-x-1/2 whitespace-nowrap text-[10px] ${captionTone(stateOf(n))}`}
            style={{ left: `${n.pct * 100}%` }}
          >
            {captionOf(n)}
          </span>
        ) : null,
      )}
    </div>
  );
}

/** Drop captions that would collide, but never the next milestone's. */
function visibleCaptions(notches: Notch[], stateOf: (n: Notch) => NodeState): Set<string> {
  const next = notches.find((n) => stateOf(n) === 'next');
  const shown = new Set<string>(next ? [next.id] : []);
  let last = -1;
  for (const n of notches) {
    const clearOfNext = !next || n.id === next.id || Math.abs(n.pct - next.pct) >= CAPTION_GAP;
    if (n.id === next?.id || (n.pct - last >= CAPTION_GAP && clearOfNext)) {
      shown.add(n.id);
      last = n.pct;
    }
  }
  return shown;
}

function captionTone(state: NodeState): string {
  if (state === 'next') return 'text-accent';
  if (state === 'hit') return 'text-muted opacity-60 line-through decoration-muted';
  return 'text-muted opacity-55';
}

function Node({ state, unlocked }: { state: NodeState; unlocked: boolean }) {
  if (state === 'hit') {
    return (
      <span
        className={`block h-2.5 w-2.5 rounded-full bg-accent ring-[3px] ring-background ${
          unlocked ? 'goal-node-pop' : ''
        }`}
      />
    );
  }
  if (state === 'next') {
    return <span className="goal-next block h-3.5 w-3.5 rounded-full border-2 border-accent bg-background" />;
  }
  if (state === 'skipped') {
    return <span className="block h-2.5 w-2.5 rounded-full border border-accent bg-background" />;
  }
  return <span className="block h-2 w-2 rounded-full border border-muted bg-background" />;
}
