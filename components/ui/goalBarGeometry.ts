// Pure layout math for GoalBar — split out so the component file (rendering,
// interaction, motion) stays under the line cap. No React here.

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

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 52.5 → "52.5", 60.0 → "60". Milestone captions have to stay narrow. */
export function fmtGoalValue(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export interface Notch {
  id: string;
  pct: number;
  caption: string;
  hit: boolean;
}

export interface Geometry {
  mode: 'numeric' | 'count';
  /** What the bar draws. Never regresses — a cleared notch holds the fill. */
  fillPct: number;
  /** Where `current` actually sits. Null in count mode. */
  currentPct: number | null;
  /** current has fallen back below a notch already cleared. */
  slipped: boolean;
  /** The cleared notch you're actually sitting at while slipped — null otherwise. */
  currentTierId: string | null;
  notches: Notch[];
}

export interface GeometryInput {
  milestones: GoalBarMilestone[];
  start?: number | null;
  target?: number | null;
  current?: number | null;
  best?: number | null;
  direction?: GoalDirection;
}

// The bar reads its own goal: milestones carrying values draw to scale between
// start and target; a tick-only set falls back to evenly spaced count mode. One
// component, one look — a manual goal never has to invent numbers to fit in.
export function geometry({ milestones, start, target, current, best }: GeometryInput): Geometry {
  const numeric =
    start != null && target != null && start !== target && milestones.some((m) => m.value != null);

  if (!numeric) {
    const total = milestones.length || 1;
    const notches = milestones.map((m, i) => ({
      id: m.id,
      pct: (i + 1) / total,
      caption: m.label ?? (m.value != null ? fmtGoalValue(m.value) : String(i + 1)),
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
      currentTierId: null,
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
  const slipped = currentPct != null && currentPct < fillPct - 0.001;

  // While slipped, the tier you're actually working at is the furthest cleared
  // notch at or below where you've fallen back to — distinct from notches you
  // cleared and moved past, which stay lit but no longer describe today.
  const currentTierId =
    !slipped || currentPct == null
      ? null
      : (notches.reduce<Notch | null>(
          (tier, n) => (n.hit && n.pct <= currentPct + 0.001 && n.pct > (tier?.pct ?? -1) ? n : tier),
          null,
        )?.id ?? null);

  return {
    mode: 'numeric',
    fillPct,
    currentPct,
    // Anything short of the fill is a slip, however the fill got there.
    slipped,
    currentTierId,
    notches,
  };
}

/** The headline number on a goal card. Same source of truth as the bar's fill. */
export function goalPercent(input: GeometryInput): number {
  return Math.round(geometry(input).fillPct * 100);
}
