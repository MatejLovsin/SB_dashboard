'use client';

import { useEffect, useRef, useState } from 'react';

export type GoalDirection = 'up' | 'down';

export interface GoalBarMilestone {
  id: string;
  /** Shown under the notch. Falls back to the formatted value. */
  label?: string | null;
  /** Null on a tick-only milestone — the bar then falls back to count mode. */
  value?: number | null;
  completed: boolean;
  /** Date the threshold was first crossed. Never cleared once written. */
  hitAt?: string | null;
}

interface GoalBarProps {
  milestones: GoalBarMilestone[];
  start?: number | null;
  target?: number | null;
  /** Where you are now — drives the slip marker. */
  current?: number | null;
  /**
   * Best ever reached. The fill holds here even when `current` has fallen back,
   * which is the whole "once cleared, stays cleared" rule. Defaults to `current`.
   */
  best?: number | null;
  unit?: string | null;
  direction?: GoalDirection;
  /** `strip` drops the per-notch captions for the hub rail. */
  size?: 'strip' | 'full';
  /** Manual goals only — an auto goal's notches are derived, not clicked. */
  onToggle?: (id: string) => void;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 52.5 → "52.5", 60.0 → "60". Milestone captions have to stay narrow. */
export function fmtGoalValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

interface Notch {
  id: string;
  pct: number;
  caption: string;
  hit: boolean;
}

interface Geometry {
  mode: 'numeric' | 'count';
  /** What the bar draws. Never regresses — a cleared notch holds the fill. */
  fillPct: number;
  /** Where `current` actually sits. Null in count mode. */
  currentPct: number | null;
  /** current has fallen back below a notch already cleared. */
  slipped: boolean;
  notches: Notch[];
}

type GeometryInput = Pick<
  GoalBarProps,
  'milestones' | 'start' | 'target' | 'current' | 'best' | 'direction'
>;

// The bar reads its own goal: milestones carrying values draw to scale between
// start and target; a tick-only set falls back to evenly spaced count mode. One
// component, one look — a manual goal never has to invent numbers to fit in.
function geometry({ milestones, start, target, current, best }: GeometryInput): Geometry {
  const numeric =
    start != null && target != null && start !== target && milestones.some((m) => m.value != null);

  if (!numeric) {
    const total = milestones.length || 1;
    const notches = milestones.map((m, i) => ({
      id: m.id,
      pct: (i + 1) / total,
      caption: m.label ?? String(i + 1),
      hit: m.completed,
    }));
    // Same rule as numeric mode: the fill reaches the furthest cleared notch.
    // Filling by count instead would strand a lit notch past the fill edge the
    // moment you tick out of order, which just reads as a bug.
    return {
      mode: 'count',
      fillPct: notches.reduce((max, n) => (n.hit && n.pct > max ? n.pct : max), 0),
      currentPct: null,
      slipped: false,
      notches,
    };
  }

  // Signed span, so a `down` goal (82 → 75) normalizes with the same formula.
  const from = start as number;
  const span = (target as number) - from;
  const norm = (v: number) => clamp01((v - from) / span);

  const notches: Notch[] = milestones
    .filter((m) => m.value != null)
    .map((m) => ({
      id: m.id,
      pct: norm(m.value as number),
      caption: m.label ?? fmtGoalValue(m.value as number),
      hit: m.completed,
    }))
    .sort((a, b) => a.pct - b.pct);

  const currentPct = current != null ? norm(current) : null;
  const bestPct = best != null ? norm(best) : currentPct;
  const clearedPct = notches.reduce((max, n) => (n.hit && n.pct > max ? n.pct : max), 0);
  // The fill is the furthest you have ever been: your best, or the furthest
  // cleared notch. A best that lands BETWEEN two milestones still counts, which
  // is why this can't be derived from the notches alone.
  const fillPct = Math.max(bestPct ?? 0, clearedPct);

  return {
    mode: 'numeric',
    fillPct,
    currentPct,
    // Anything short of the fill is a slip, however the fill got there.
    slipped: currentPct != null && currentPct < fillPct - 0.001,
    notches,
  };
}

/** The headline number on a goal card. Same source of truth as the bar's fill. */
export function goalPercent(input: GeometryInput): number {
  return Math.round(geometry(input).fillPct * 100);
}

export function GoalBar({
  milestones,
  start,
  target,
  current,
  best,
  unit,
  direction = 'up',
  size = 'full',
  onToggle,
}: GoalBarProps) {
  const geo = geometry({ milestones, start, target, current, best, direction });
  const strip = size === 'strip';
  const suffix = unit ?? '';

  // Fill in from zero on mount, so arriving at the page reads as progress being
  // drawn rather than a static value. The reduced-motion guard in globals.css
  // kills the transition, which lands it at the final width instantly.
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // The unlock flare fires from the click itself rather than from diffing props:
  // a notch only ever goes from unhit to hit because someone ticked it, and an
  // auto goal's progress arrives on page load, where the fill draw-in already
  // carries the motion.
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const flare = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flare.current) clearTimeout(flare.current); }, []);

  const toggle = (notch: Notch) => {
    onToggle?.(notch.id);
    if (notch.hit) return; // un-ticking a mistake shouldn't celebrate
    setUnlocked(notch.id);
    if (flare.current) clearTimeout(flare.current);
    flare.current = setTimeout(() => setUnlocked(null), 700);
  };

  const fill = drawn ? geo.fillPct : 0;
  const done = geo.fillPct >= 1;

  return (
    <div>
      <div className={`relative ${strip ? 'h-4' : 'h-5'}`}>
        {/* Track — a hairline rule, not a container. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />

        {/* Cleared portion — the same rule, thickened and lit. */}
        <div
          className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-accent"
          style={{
            width: `${fill * 100}%`,
            transition: 'width var(--dur-slow) var(--ease-out-quint)',
          }}
        />

        {/* Playhead: the leading edge of the fill. Suppressed at 0 and at 100%,
            where it would sit on top of the start / target caps. */}
        {fill > 0.005 && !done ? (
          <div
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ${
              strip ? 'h-2 w-[3px]' : 'h-2.5 w-[3px]'
            }`}
            style={{
              left: `${fill * 100}%`,
              boxShadow: '0 0 10px var(--accent)',
              transition: 'left var(--dur-slow) var(--ease-out-quint)',
            }}
          />
        ) : null}

        {geo.notches.map((n) =>
          onToggle ? (
            <button
              key={n.id}
              type="button"
              onClick={() => toggle(n)}
              aria-pressed={n.hit}
              aria-label={`${n.caption}${n.hit ? ' — cleared' : ''}`}
              className={`press-flash absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full ${
                strip ? 'h-4 w-4' : 'h-5 w-6'
              }`}
              style={{ left: `${n.pct * 100}%` }}
            >
              <Notchmark
                hit={n.hit}
                strip={strip}
                behindFill={n.pct < geo.fillPct - 0.001}
                unlocked={unlocked === n.id}
              />
            </button>
          ) : (
            <div
              key={n.id}
              className={`absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${
                strip ? 'h-4 w-4' : 'h-5 w-6'
              }`}
              style={{ left: `${n.pct * 100}%` }}
            >
              <Notchmark
                hit={n.hit}
                strip={strip}
                behindFill={n.pct < geo.fillPct - 0.001}
                unlocked={unlocked === n.id}
              />
            </div>
          ),
        )}

        {/* Slip: current has fallen below a notch already cleared. The fill holds
            (a cleared milestone stays cleared) but the hollow mark says where you
            actually are. Neutral, not --down — it's a position, not an alarm. */}
        {geo.slipped && geo.currentPct != null ? (
          <div
            className="absolute top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-muted bg-background"
            style={{ left: `${geo.currentPct * 100}%` }}
            aria-hidden
          />
        ) : null}
      </div>

      {/* Per-notch captions. The strip variant shows only the two ends. */}
      {geo.mode === 'numeric' && !strip ? (
        <div className="relative mt-1 h-3">
          {geo.notches.map((n) => (
            <span
              key={n.id}
              className={`nums absolute -translate-x-1/2 whitespace-nowrap text-[10px] ${
                n.hit ? 'text-accent' : 'text-muted opacity-55'
              }`}
              style={{ left: `${n.pct * 100}%` }}
            >
              {n.caption}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative mt-1.5 flex items-baseline justify-between gap-2">
        <Endcap className="text-muted opacity-60">
          {geo.mode === 'numeric' && start != null ? (
            <>
              {fmtGoalValue(start)}
              <Unit>{suffix}</Unit>
            </>
          ) : (
            <span className="label text-[9px]">Start</span>
          )}
        </Endcap>

        {/* Tracks the hollow marker's x, so the readout sits under the thing it
            names rather than floating in the middle of the row. */}
        {geo.slipped && geo.currentPct != null && current != null ? (
          <Endcap
            className="absolute -translate-x-1/2 whitespace-nowrap text-muted"
            style={{ left: `${Math.min(88, Math.max(12, geo.currentPct * 100))}%` }}
          >
            <span className="label mr-1 text-[9px] opacity-70">now</span>
            {fmtGoalValue(current)}
            <Unit>{suffix}</Unit>
          </Endcap>
        ) : null}

        <Endcap className={done ? 'text-accent' : 'text-muted opacity-60'}>
          {geo.mode === 'numeric' && target != null ? (
            <>
              {fmtGoalValue(target)}
              <Unit>{suffix}</Unit>
            </>
          ) : (
            `${geo.notches.filter((n) => n.hit).length}/${geo.notches.length}`
          )}
        </Endcap>
      </div>
    </div>
  );
}

/** End-of-rail readout. Numbers take the display face per the type roles; the
 *  unit stays lowercase body text, since `.label` would shout it as "40KG". */
function Endcap({
  className = '',
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <span className={`nums text-[10px] ${className}`} style={style}>
      {children}
    </span>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return children ? (
    <span className="ml-0.5 font-sans text-[9px] tracking-normal">{children}</span>
  ) : null;
}

function Notchmark({
  hit,
  strip,
  behindFill,
  unlocked,
}: {
  hit: boolean;
  strip: boolean;
  behindFill: boolean;
  unlocked: boolean;
}) {
  // A milestone you skipped past sits on top of the lit rule, where a hairline
  // mark would be invisible — so it reads as an open ring instead.
  if (!hit && behindFill) {
    return (
      <span className="block h-[7px] w-[7px] rounded-full border border-accent bg-background" />
    );
  }
  return (
    <span
      className={`block rounded-full transition-colors duration-200 ${
        hit ? 'w-[2px] bg-accent' : 'w-px bg-border'
      } ${strip ? 'h-2' : 'h-2.5'} ${unlocked ? 'goal-unlock' : ''}`}
    />
  );
}
