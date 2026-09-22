import type { ProgrammeEmphasis, SessionEmphasis } from '@/lib/db/types';

/**
 * Heavy / light split for est-1RM series.
 *
 * With one heavy and two light sessions a week on the same lift, a single
 * connected line swings ~12% between neighbours and reads as "up and down"
 * rather than as progress. Every screen that draws or judges an est-1RM trend
 * has to agree about which sessions are comparable, so that rule lives here.
 *
 * The rule: light days are held apart as their own series. Heavy days and
 * unclassified days (anything logged before the split existed, or outside a
 * plan) share the main series — before the split there was only one intensity,
 * so those points genuinely are comparable to each other.
 */

export type Emphasis = ProgrammeEmphasis | null;

/** A point in an est-1RM series, tagged with how that session was trained. */
export type EmphasisPoint = { emphasis: Emphasis };

/** The session's frozen label for one exercise. Absent snapshot → unclassified. */
export function emphasisFor(snapshot: SessionEmphasis | null | undefined, exerciseId: string): Emphasis {
  const found = snapshot?.[exerciseId];
  return found === 'heavy' || found === 'light' ? found : null;
}

/** Only `light` is held apart; `heavy` and unclassified both drive the main line. */
export function isLight(emphasis: Emphasis): boolean {
  return emphasis === 'light';
}

/**
 * One est-1RM value routed into the two chart series. Exactly one side is a
 * number and the other is null, so two Recharts `<Line connectNulls>` over the
 * same rows each step over the other's points.
 */
export function splitE1RM(
  e1rm: number,
  emphasis: Emphasis,
): { main: number | null; light: number | null } {
  return isLight(emphasis) ? { main: null, light: e1rm } : { main: e1rm, light: null };
}

/**
 * The comparable series: light days dropped. This is what "am I progressing"
 * should be measured against — a stall check or a goal that counts a light day
 * as a failed heavy day is just reading the programme, not the progress.
 */
export function mainSeries<T extends EmphasisPoint>(points: T[]): T[] {
  return points.filter((p) => !isLight(p.emphasis));
}

/** The light series on its own, oldest → newest like its input. */
export function lightSeries<T extends EmphasisPoint>(points: T[]): T[] {
  return points.filter((p) => isLight(p.emphasis));
}

/**
 * Whether this exercise is actually trained at two intensities. Below two light
 * days there is nothing to connect, so the charts stay single-series rather than
 * showing a legend and a second color for one stray dot.
 */
export function hasLightSplit(points: EmphasisPoint[]): boolean {
  return lightSeries(points).length >= 2;
}
