'use client';

// The loading screen. Not a spinner and not the /goals card — one goal you are
// actually chasing, held at the optical centre of the screen: its name, its
// percent counting up, and a single lit rule beneath that draws out to where
// you have got to. Past the leading edge the rule keeps reaching: a run of
// ticks chasing the target on a loop. Solid is what you have earned; the chase
// is the load still working. One rule, two meanings, no spinner.
//
// Behind it, dimmed to a ghost, sits the shape of the page being loaded — so
// the arrival reads as the page coming up to light rather than a swap.
//
// Two rules keep it from feeling like a glitch:
//   1. Nothing paints for HOLD_MS. Most navigations resolve faster than that,
//      and a screen that appears and vanishes reads as a fault.
//   2. On a genuinely slow load the goal changes, so the wait shows you more
//      than it costs you.
//
// The data comes from lib/utils/goalSnapshot.ts — a Suspense fallback renders
// before its page's data exists, so it cannot fetch.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { GoalSection } from '@/lib/db/types';
import { CountUp } from '@/components/ui/CountUp';
import {
  orderForSection,
  readGoalSnapshot,
  serverGoalSnapshot,
  subscribeGoalSnapshot,
  type GoalSnapshot,
} from '@/lib/utils/goalSnapshot';

/** Under this, a navigation should just look instant. */
const HOLD_MS = 200;
const ROTATE_MS = 2500;

/** Viewport minus the top bar and `main`'s own padding — see AppShell. Centring
 *  against this lands the goal within a hair of the true centre of the screen. */
const STAGE = 'min-h-[calc(100dvh-10.5rem)] md:min-h-[calc(100dvh-6.5rem)]';

interface LoadingScreenProps {
  /** Prefers this section's goals. Omit on the home screen. */
  section?: GoalSection;
  /** The page-shaped skeleton, rendered as the ghost behind the goal. */
  children: ReactNode;
}

export function LoadingScreen({ section, children }: LoadingScreenProps) {
  const [shown, setShown] = useState(false);
  const [index, setIndex] = useState(0);

  // Through useSyncExternalStore rather than an effect: this renders on the
  // server too, and the server knows nothing about localStorage — so the first
  // client paint has to agree with it (empty) and only then swap in. The 200ms
  // hold covers that extra frame.
  const stored = useSyncExternalStore(subscribeGoalSnapshot, readGoalSnapshot, serverGoalSnapshot);
  const goals = useMemo(() => orderForSection(stored, section), [stored, section]);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (goals.length < 2) return;
    const id = setInterval(() => setIndex((n) => (n + 1) % goals.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [goals.length]);

  const goal = goals[index] ?? null;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={`relative flex items-center justify-center overflow-hidden ${STAGE}`}
      style={{ opacity: shown ? 1 : 0, transition: 'opacity var(--dur-mid) ease' }}
    >
      {/* Structure without light. Deliberately static: the rule below owns the
          only motion on screen. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 opacity-50" aria-hidden="true">
        {children}
      </div>

      {/* `stagger-fade` fades each goal up; the key remounts the trace so it
          redraws from zero every time the goal changes. */}
      <div className="stagger-fade relative w-full max-w-[21rem]">
        {goal ? <LoadingGoal key={goal.id} goal={goal} /> : null}
      </div>
    </div>
  );
}

function LoadingGoal({ goal }: { goal: GoalSnapshot }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="display line-clamp-2 text-pretty text-[15px] leading-snug">{goal.title}</h2>
        {/* CountUp runs 0 → value over 900ms on ease-out-quint — the same
            duration and curve as the fill, so the number and the rule arrive
            together. */}
        <span className="nums shrink-0 text-[15px] font-bold text-accent">
          <CountUp value={goal.percent} suffix="%" />
        </span>
      </div>
      <Trace percent={goal.percent} />
    </div>
  );
}

/** Ticks in the chase, and how far apart they sit (px from the leading edge). */
const CHASE = [0, 1, 2, 3, 4];
const CHASE_GAP = 9;
const CHASE_LEAD = 12;

/**
 * The line. A hairline the width of the goal, thickened and lit as far as you
 * have come, with the leading edge glowing — the same vocabulary as GoalBar,
 * stripped of its notches, captions and endcaps, because here it is the only
 * thing on screen and has nothing to sit beside. What GoalBar does not have is
 * the chase: the ticks beyond the playhead, which are the only thing on the
 * screen that repeats, and therefore the only thing saying "still working".
 */
function Trace({ percent }: { percent: number }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pct = drawn ? Math.min(100, Math.max(0, percent)) : 0;
  const draw = 'var(--dur-slow) var(--ease-out-quint)';

  return (
    <div className="relative mt-3.5 h-3">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />

      {/* The chase. Its own clipping layer so ticks that run past the target
          disappear into it, while the playhead's glow — which would be cut by
          a 12px-tall overflow box — stays outside. Tailwind's `pulse` supplies
          the keyframes; the stagger is what turns five blinks into a wave. */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {CHASE.map((i) => (
          <div
            key={i}
            className="absolute top-1/2 h-[3px] w-[3px] -translate-y-1/2 animate-pulse rounded-full bg-accent"
            style={{
              left: `calc(${pct}% + ${CHASE_LEAD + i * CHASE_GAP}px)`,
              animationDuration: '1.2s',
              animationDelay: `${i * 120}ms`,
              transition: `left ${draw}`,
            }}
          />
        ))}
      </div>

      <div
        className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-accent"
        style={{ width: `${pct}%`, transition: `width ${draw}` }}
      />

      {/* Suppressed at the ends, where it would sit on top of nothing. */}
      {pct > 0.5 && pct < 99.5 ? (
        <div
          className="absolute top-1/2 h-2.5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${pct}%`, boxShadow: '0 0 10px var(--accent)', transition: `left ${draw}` }}
        />
      ) : null}
    </div>
  );
}
