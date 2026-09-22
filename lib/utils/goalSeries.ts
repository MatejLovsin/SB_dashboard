import { mondayOf } from './stats';

/**
 * The shape every goal metric resolves to, and the pure transforms over it.
 *
 * Split out of lib/queries/goals.ts so the arithmetic a progress bar depends on
 * sits next to the other pure logic, where it can be tested without a database.
 */

export interface Observation {
  /** ISO date (or timestamp) the value was observed. */
  at: string;
  value: number;
}

export const byDate = (a: Observation, b: Observation) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);

/** Running mean — the series so far, averaged, at each point. */
export function runningAverage(values: Observation[]): Observation[] {
  let sum = 0;
  return values.map((o, i) => {
    sum += o.value;
    return { at: o.at, value: sum / (i + 1) };
  });
}

/** One observation per week with the streak length as of that week. */
export function streakSeries(performedAt: string[]): Observation[] {
  const weeks = [...new Set(performedAt.map((d) => mondayOf(new Date(d))))].sort();
  const out: Observation[] = [];
  let run = 0;
  let previous: string | null = null;
  for (const week of weeks) {
    if (previous) {
      const gap = (Date.parse(week) - Date.parse(previous)) / 604_800_000;
      run = Math.round(gap) === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    out.push({ at: week, value: run });
    previous = week;
  }
  return out;
}
