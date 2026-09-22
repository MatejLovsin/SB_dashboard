// The loading screens show real goals — which means they need goal data before
// any query has run. A `loading.tsx` is a Suspense *fallback*: React renders it
// BEFORE its page's data exists, so it cannot await Supabase without defeating
// its own purpose, and an auto goal's progress is resolved on the server out of
// rows we deliberately never ship to the client (see lib/queries/goals.ts).
//
// So the goals surfaces leave a breadcrumb instead. Every page that renders
// resolved goals flattens them into localStorage here, and the loading screen
// reads that back. The numbers are last-known rather than live — for a screen
// that lives for 300ms, a bar that is one tick behind beats a spinner.

import type { GoalSection } from '@/lib/db/types';
import type { ResolvedGoal } from '@/lib/queries/goals';

const KEY = 'sb.goal-snapshot.v1';

/** Past this, the breadcrumb is more likely to mislead than to inform. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** What the loading screen draws, and nothing else: a name and how far along
 *  it is. Not the /goals card — no milestones, no units, no endcaps. */
export interface GoalSnapshot {
  id: string;
  title: string;
  section: GoalSection;
  percent: number;
}

/** `'all'` replaces the whole snapshot; a section replaces only its own goals,
 *  so a hub rail can write what it knows without erasing the other sections. */
export type SnapshotScope = GoalSection | 'all';

// Read through a cache keyed on the raw string, so `readGoalSnapshot` can be a
// `useSyncExternalStore` getter: it has to return the SAME array reference
// until the stored value actually changes, or React re-renders forever.
const EMPTY: GoalSnapshot[] = [];
let cachedRaw: string | null = null;
let cached: GoalSnapshot[] = EMPTY;
const listeners = new Set<() => void>();

function rawItem(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    // Private mode or storage disabled — the loading screen falls back to its
    // skeleton, which is exactly what a first-ever visit shows anyway.
    return null;
  }
}

function parse(raw: string): GoalSnapshot[] {
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return EMPTY;
    const rec = data as Record<string, unknown>;
    if (typeof rec.at !== 'number' || !Array.isArray(rec.goals)) return EMPTY;
    if (Date.now() - rec.at > MAX_AGE_MS) return EMPTY;
    return rec.goals as GoalSnapshot[];
  } catch {
    return EMPTY; // A shape from an older build.
  }
}

export function readGoalSnapshot(): GoalSnapshot[] {
  const raw = rawItem();
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  cached = raw === null ? EMPTY : parse(raw);
  return cached;
}

/** The server has no storage, and the first client paint must agree with it. */
export function serverGoalSnapshot(): GoalSnapshot[] {
  return EMPTY;
}

export function subscribeGoalSnapshot(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== 'undefined') window.addEventListener('storage', notify);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== 'undefined') window.removeEventListener('storage', notify);
  };
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function writeGoalSnapshot(scope: SnapshotScope, goals: GoalSnapshot[]): void {
  if (typeof window === 'undefined') return;
  const kept = scope === 'all' ? [] : readGoalSnapshot().filter((g) => g.section !== scope);
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), goals: [...kept, ...goals] }));
    notify();
  } catch {
    // Quota or a blocked store — nothing here is worth failing a render over.
  }
}

/**
 * What the loading screen shows, in order: this section's goals first, nearest
 * to done first within each group. Finished goals are dropped — a full bar
 * mid-navigation reads as "done", which is the wrong signal — unless that is
 * all there is.
 */
export function orderForSection(goals: GoalSnapshot[], section?: GoalSection): GoalSnapshot[] {
  const live = goals.filter((g) => g.percent < 100);
  const pool = live.length > 0 ? live : goals;
  const nearest = (a: GoalSnapshot, b: GoalSnapshot) => b.percent - a.percent;
  if (!section) return [...pool].sort(nearest);
  return [
    ...pool.filter((g) => g.section === section).sort(nearest),
    ...pool.filter((g) => g.section !== section).sort(nearest),
  ];
}

/** A resolved goal, flattened. `percent` is taken as an argument so a board
 *  holding optimistic ticks can pass its own number. */
export function toGoalSnapshot(r: ResolvedGoal, percent: number = r.percent): GoalSnapshot {
  return { id: r.goal.id, title: r.goal.title, section: r.goal.section, percent };
}
