'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fmtGoalValue,
  geometry,
  goalPercent,
  type GoalBarMilestone,
  type GoalDirection,
  type Notch,
} from './goalBarGeometry';

export type { GoalDirection, GoalBarMilestone };
export { fmtGoalValue, goalPercent };

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
                currentTier={n.id === geo.currentTierId}
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
                currentTier={n.id === geo.currentTierId}
              />
            </div>
          ),
        )}
      </div>

      {/* Per-notch captions. The strip variant shows only the two ends. */}
      {geo.mode === 'numeric' && !strip ? (
        <div className="relative mt-1 h-3">
          {geo.notches.map((n) => (
            <span
              key={n.id}
              className={`nums absolute -translate-x-1/2 whitespace-nowrap text-[10px] ${captionClass(n, geo.currentTierId)}`}
              style={{ left: `${n.pct * 100}%` }}
            >
              {n.caption}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-2">
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

/** Cleared notches read as done (muted, struck through) rather than still-active
 *  (accent), except the one you're actually sitting at after a slip — that one
 *  keeps the accent so it reads as "here", not "history". */
function captionClass(n: Notch, currentTierId: string | null): string {
  if (n.id === currentTierId) return 'text-accent';
  if (n.hit) return 'text-muted opacity-55 line-through decoration-muted';
  return 'text-muted opacity-55';
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
  currentTier,
}: {
  hit: boolean;
  strip: boolean;
  behindFill: boolean;
  unlocked: boolean;
  /** The cleared tier you're actually sitting at after a slip — gets a shade. */
  currentTier: boolean;
}) {
  // A milestone you skipped past sits on top of the lit rule, where a hairline
  // mark would be invisible — so it reads as an open ring instead.
  if (!hit && behindFill) {
    return (
      <span className="block h-[7px] w-[7px] rounded-full border border-accent bg-background" />
    );
  }
  if (currentTier) {
    return (
      <span className="flex h-[9px] w-[9px] items-center justify-center rounded-full bg-accent-soft">
        <span className={`block h-[3px] w-[3px] rounded-full bg-accent ${unlocked ? 'goal-unlock' : ''}`} />
      </span>
    );
  }
  return (
    <span
      className={`block rounded-full transition-colors duration-200 ${
        hit ? 'w-px bg-muted' : 'w-px bg-border'
      } ${strip ? 'h-2' : 'h-2.5'} ${unlocked ? 'goal-unlock' : ''}`}
    />
  );
}
