// Goals — a written-down target, its milestones, and the progress bar's numbers.
//
// A goal is MANUAL (you tick milestones and log check-ins) or AUTO (bound to a
// metric the app already records). Both render identically; see
// components/ui/GoalBar.tsx and supabase/migrations/0017_goals.sql.
//
// THE ONE RULE: an auto goal is resolved ON READ. Nothing here is written back
// to by finishing a session, saving a grade or moving a card, and no trigger
// watches those tables — so every existing mutation path stays untouched, and a
// goal created today backfills its milestone dates out of history for free.
//
// Every metric resolves to the same shape: a time-ordered series of
// observations plus an aggregation mode. `peak` keeps a running best (a PR, a
// grade); `cumulative` keeps a running total (volume, hours, cards). From that
// one shape we derive the headline value, the milestone hit dates, and the
// trend chart — so adding a metric kind means writing one query, not one of
// everything.

import type {
  Goal,
  GoalCheckin,
  GoalDirection,
  GoalMetricJson,
  GoalMilestone,
  GoalSection,
  GoalStatus,
} from '@/lib/db/types';
import { estimatedOneRepMax, mondayOf } from '@/lib/utils/stats';
import { countedExams, resolveAttempts } from '@/lib/utils/grades';
import type { Client } from './fitness';

export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (section?: GoalSection | null) => [...goalKeys.lists(), section ?? 'all'] as const,
  detail: (id: string) => [...goalKeys.all, 'detail', id] as const,
  resolved: (section?: GoalSection | null) =>
    [...goalKeys.all, 'resolved', section ?? 'all'] as const,
};

export const GOAL_SECTIONS: GoalSection[] = ['fitness', 'school', 'work', 'life'];

/* ══ The metric catalog ═══════════════════════════════════════════════════ */

export type GoalMetric =
  // ── Fitness · weights
  | { kind: 'exercise_best_weight'; exerciseId: string }
  | { kind: 'exercise_best_e1rm'; exerciseId: string }
  | { kind: 'exercise_reps_at_weight'; exerciseId: string; weight: number }
  | { kind: 'exercise_total_volume'; exerciseId: string }
  | { kind: 'workout_session_count' }
  | { kind: 'workout_streak_weeks' }
  // ── Fitness · body
  | { kind: 'bodyweight' }
  | { kind: 'bodyfat_pct' }
  // ── Fitness · cardio (activity omitted = every activity)
  | { kind: 'cardio_total_distance'; activity?: string | null }
  | { kind: 'cardio_longest_distance'; activity?: string | null }
  | { kind: 'cardio_total_duration'; activity?: string | null }
  | { kind: 'cardio_session_count'; activity?: string | null }
  // ── School
  | { kind: 'exam_grade'; examId: string }
  | { kind: 'subject_best_grade'; subjectId: string }
  | { kind: 'subject_avg_grade'; subjectId: string }
  | { kind: 'overall_avg_grade' }
  | { kind: 'study_hours'; subjectId?: string | null }
  | { kind: 'study_session_count'; subjectId?: string | null }
  // ── Work
  | { kind: 'cards_done'; boardId?: string | null }
  | { kind: 'work_metric_value'; label: string }
  | { kind: 'work_metric_total'; label: string };

export type GoalMetricKind = GoalMetric['kind'];

/** What the create-goal picker has to collect before the binding is complete. */
export type MetricArg = 'exercise' | 'subject' | 'exam' | 'board' | 'activity' | 'label' | 'weight';

export type AggregationMode = 'peak' | 'cumulative';

export interface GoalMetricDef {
  kind: GoalMetricKind;
  section: GoalSection;
  /** Picker label. */
  label: string;
  /** What it actually reads — shown as help text under the picker. */
  hint: string;
  /** Required before the binding is valid. */
  args: MetricArg[];
  /** Narrows the metric when present; "all" when omitted. */
  optional?: MetricArg[];
  mode: AggregationMode;
  /** Suggested `goals.unit`; the user can override. */
  unit?: string;
  /** Goals of this kind usually count down (bodyweight, bodyfat). */
  defaultDirection?: GoalDirection;
}

// The picker is a fixed list, deliberately. A general "build any query" UI is a
// second app; this covers everything the schema can actually answer today.
export const GOAL_METRICS: GoalMetricDef[] = [
  {
    kind: 'exercise_best_weight',
    section: 'fitness',
    label: 'Best weight on a lift',
    hint: 'Heaviest completed set ever logged for one exercise.',
    args: ['exercise'],
    mode: 'peak',
    unit: 'kg',
  },
  {
    kind: 'exercise_best_e1rm',
    section: 'fitness',
    label: 'Best estimated 1RM',
    hint: 'Highest Epley-estimated one-rep max for one exercise.',
    args: ['exercise'],
    mode: 'peak',
    unit: 'kg',
  },
  {
    kind: 'exercise_reps_at_weight',
    section: 'fitness',
    label: 'Reps at a given weight',
    hint: 'Most reps completed in a single set at or above a weight.',
    args: ['exercise', 'weight'],
    mode: 'peak',
    unit: 'reps',
  },
  {
    kind: 'exercise_total_volume',
    section: 'fitness',
    label: 'Lifetime volume on a lift',
    hint: 'Running total of weight × reps across every session.',
    args: ['exercise'],
    mode: 'cumulative',
    unit: 'kg',
  },
  {
    kind: 'workout_session_count',
    section: 'fitness',
    label: 'Total workouts logged',
    hint: 'Every weightlifting session, counted from the first.',
    args: [],
    mode: 'cumulative',
  },
  {
    kind: 'workout_streak_weeks',
    section: 'fitness',
    label: 'Longest weekly streak',
    hint: 'Consecutive weeks with at least one session.',
    args: [],
    mode: 'peak',
    unit: 'weeks',
  },
  {
    kind: 'bodyweight',
    section: 'fitness',
    label: 'Bodyweight',
    hint: 'Most recent logged bodyweight.',
    args: [],
    mode: 'peak',
    unit: 'kg',
    defaultDirection: 'down',
  },
  {
    kind: 'bodyfat_pct',
    section: 'fitness',
    label: 'Body fat',
    hint: 'Most recent logged body-fat percentage.',
    args: [],
    mode: 'peak',
    unit: '%',
    defaultDirection: 'down',
  },
  {
    kind: 'cardio_total_distance',
    section: 'fitness',
    label: 'Total distance',
    hint: 'Running total of logged distance, optionally for one activity.',
    args: [],
    optional: ['activity'],
    mode: 'cumulative',
    unit: 'km',
  },
  {
    kind: 'cardio_longest_distance',
    section: 'fitness',
    label: 'Longest single effort',
    hint: 'Furthest distance in one cardio entry.',
    args: [],
    optional: ['activity'],
    mode: 'peak',
    unit: 'km',
  },
  {
    kind: 'cardio_total_duration',
    section: 'fitness',
    label: 'Total cardio time',
    hint: 'Running total of logged minutes.',
    args: [],
    optional: ['activity'],
    mode: 'cumulative',
    unit: 'min',
  },
  {
    kind: 'cardio_session_count',
    section: 'fitness',
    label: 'Cardio sessions logged',
    hint: 'Count of cardio entries, optionally for one activity.',
    args: [],
    optional: ['activity'],
    mode: 'cumulative',
  },
  {
    kind: 'exam_grade',
    section: 'school',
    label: 'Grade on one exam',
    hint: 'The grade recorded for a specific exam.',
    args: ['exam'],
    mode: 'peak',
  },
  {
    kind: 'subject_best_grade',
    section: 'school',
    label: 'Best grade in a subject',
    hint: 'Highest grade recorded for one subject.',
    args: ['subject'],
    mode: 'peak',
  },
  {
    kind: 'subject_avg_grade',
    section: 'school',
    label: 'Average grade in a subject',
    hint: 'Running average of graded exams in one subject.',
    args: ['subject'],
    mode: 'peak',
  },
  {
    kind: 'overall_avg_grade',
    section: 'school',
    label: 'Overall average grade',
    hint: 'Running average across every graded exam.',
    args: [],
    mode: 'peak',
  },
  {
    kind: 'study_hours',
    section: 'school',
    label: 'Study hours',
    hint: 'Running total of study time, optionally for one subject.',
    args: [],
    optional: ['subject'],
    mode: 'cumulative',
    unit: 'h',
  },
  {
    kind: 'study_session_count',
    section: 'school',
    label: 'Study sessions logged',
    hint: 'Count of completed study sessions.',
    args: [],
    optional: ['subject'],
    mode: 'cumulative',
  },
  {
    kind: 'cards_done',
    section: 'work',
    label: 'Roadmap cards shipped',
    hint: 'Cards moved to Done, optionally on one board.',
    args: [],
    optional: ['board'],
    mode: 'cumulative',
  },
  {
    kind: 'work_metric_value',
    section: 'work',
    label: 'Logged metric — latest / best',
    hint: 'Any series you log under a label. The escape hatch for anything else.',
    args: ['label'],
    mode: 'peak',
  },
  {
    kind: 'work_metric_total',
    section: 'work',
    label: 'Logged metric — running total',
    hint: 'Sums every value logged under a label.',
    args: ['label'],
    mode: 'cumulative',
  },
];

export function metricDef(kind: GoalMetricKind): GoalMetricDef | undefined {
  return GOAL_METRICS.find((m) => m.kind === kind);
}

export function metricsForSection(section: GoalSection): GoalMetricDef[] {
  return GOAL_METRICS.filter((m) => m.section === section);
}

/* ══ Resolution ═══════════════════════════════════════════════════════════ */

export interface Observation {
  /** ISO date (or timestamp) the value was observed. */
  at: string;
  value: number;
}

export interface MetricSeries {
  series: Observation[];
  mode: AggregationMode;
}

/** Per-call memo so ten fitness goals don't each re-read workout_sessions. */
type Memo = Map<string, Promise<unknown>>;

function memo<T>(cache: Memo, key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const created = fn();
  cache.set(key, created);
  return created;
}

const byDate = (a: Observation, b: Observation) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);

async function sessionDates(client: Client, cache: Memo): Promise<Map<string, string>> {
  return memo(cache, 'workout_sessions', async () => {
    const { data, error } = await client.from('workout_sessions').select('id, performed_at');
    if (error) throw error;
    return new Map((data ?? []).map((s) => [s.id, s.performed_at]));
  });
}

async function cardioDates(client: Client, cache: Memo): Promise<Map<string, string>> {
  return memo(cache, 'cardio_sessions', async () => {
    const { data, error } = await client.from('cardio_sessions').select('id, performed_at');
    if (error) throw error;
    return new Map((data ?? []).map((s) => [s.id, s.performed_at]));
  });
}

/** One observation per session, from that session's sets for an exercise. */
async function perSessionFromSets(
  client: Client,
  cache: Memo,
  exerciseId: string,
  reduce: (sets: Array<{ reps: number | null; weight: number | null }>) => number | null,
): Promise<Observation[]> {
  const sets = await memo(cache, `sets:${exerciseId}`, async () => {
    const { data, error } = await client
      .from('session_sets')
      .select('session_id, reps, weight, completed')
      .eq('exercise_id', exerciseId);
    if (error) throw error;
    return data ?? [];
  });

  const dates = await sessionDates(client, cache);
  const grouped = new Map<string, Array<{ reps: number | null; weight: number | null }>>();
  for (const s of sets) {
    if (!s.completed) continue;
    const list = grouped.get(s.session_id);
    if (list) list.push(s);
    else grouped.set(s.session_id, [s]);
  }

  const out: Observation[] = [];
  for (const [sessionId, rows] of grouped) {
    const at = dates.get(sessionId);
    if (!at) continue;
    const value = reduce(rows);
    if (value != null && Number.isFinite(value)) out.push({ at, value });
  }
  return out.sort(byDate);
}

async function cardioEntries(client: Client, cache: Memo, activity?: string | null) {
  const rows = await memo(cache, 'cardio_entries', async () => {
    const { data, error } = await client
      .from('cardio_entries')
      .select('session_id, activity, duration_minutes, distance_km');
    if (error) throw error;
    return data ?? [];
  });
  if (!activity) return rows;
  const want = activity.toLowerCase();
  return rows.filter((r) => r.activity.toLowerCase() === want);
}

/** Raw exam rows — only the retake-chain walk should use these directly. */
async function allExams(client: Client, cache: Memo) {
  return memo(cache, 'exams', async () => {
    const { data, error } = await client
      .from('exams')
      .select('id, subject_id, grade, exam_date, retake_of');
    if (error) throw error;
    return data ?? [];
  });
}

/**
 * Graded exams filtered to THE GRADES THAT COUNT — best passing attempt per
 * retake chain, fails dropped (lib/utils/grades.ts). A goal must see exactly what
 * the school pages see, so no grade metric may aggregate the raw table.
 */
async function gradedExams(client: Client, cache: Memo) {
  return countedExams(await allExams(client, cache));
}

/** Running average of a chronological series — the shape a grade goal wants. */
function runningAverage(values: Observation[]): Observation[] {
  let sum = 0;
  return values.map((o, i) => {
    sum += o.value;
    return { at: o.at, value: sum / (i + 1) };
  });
}

/** One observation per week with the streak length as of that week. */
function streakSeries(performedAt: string[]): Observation[] {
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

/**
 * Turn a metric binding into its observation series. This is the only place that
 * knows how a goal reaches into the rest of the app.
 */
export async function resolveMetric(
  client: Client,
  metric: GoalMetric,
  cache: Memo = new Map(),
): Promise<MetricSeries> {
  const mode = metricDef(metric.kind)?.mode ?? 'peak';

  switch (metric.kind) {
    case 'exercise_best_weight':
      return {
        mode,
        series: await perSessionFromSets(client, cache, metric.exerciseId, (sets) =>
          Math.max(...sets.map((s) => s.weight ?? 0)),
        ),
      };

    case 'exercise_best_e1rm':
      return {
        mode,
        series: await perSessionFromSets(client, cache, metric.exerciseId, (sets) =>
          Math.max(
            ...sets.map((s) =>
              s.weight != null && s.reps != null ? estimatedOneRepMax(s.weight, s.reps) : 0,
            ),
          ),
        ),
      };

    case 'exercise_reps_at_weight': {
      const floor = metric.weight;
      return {
        mode,
        series: await perSessionFromSets(client, cache, metric.exerciseId, (sets) => {
          const qualifying = sets.filter((s) => (s.weight ?? 0) >= floor);
          return qualifying.length ? Math.max(...qualifying.map((s) => s.reps ?? 0)) : null;
        }),
      };
    }

    case 'exercise_total_volume':
      return {
        mode,
        series: await perSessionFromSets(client, cache, metric.exerciseId, (sets) =>
          sets.reduce((sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0),
        ),
      };

    case 'workout_session_count': {
      const dates = await sessionDates(client, cache);
      return { mode, series: [...dates.values()].sort().map((at) => ({ at, value: 1 })) };
    }

    case 'workout_streak_weeks': {
      const dates = await sessionDates(client, cache);
      return { mode, series: streakSeries([...dates.values()]) };
    }

    case 'bodyweight':
    case 'bodyfat_pct': {
      const rows = await memo(cache, 'body_metrics', async () => {
        const { data, error } = await client
          .from('body_metrics')
          .select('recorded_at, weight_kg, bodyfat_pct')
          .order('recorded_at');
        if (error) throw error;
        return data ?? [];
      });
      const series = rows
        .map((r) => ({
          at: r.recorded_at,
          value: metric.kind === 'bodyweight' ? r.weight_kg : (r.bodyfat_pct ?? NaN),
        }))
        .filter((o) => Number.isFinite(o.value));
      return { mode, series };
    }

    case 'cardio_total_distance':
    case 'cardio_longest_distance':
    case 'cardio_total_duration':
    case 'cardio_session_count': {
      const rows = await cardioEntries(client, cache, metric.activity);
      const dates = await cardioDates(client, cache);
      const series = rows
        .map((r) => {
          const at = dates.get(r.session_id);
          if (!at) return null;
          const value =
            metric.kind === 'cardio_total_duration'
              ? r.duration_minutes
              : metric.kind === 'cardio_session_count'
                ? 1
                : (r.distance_km ?? NaN);
          return Number.isFinite(value) ? { at, value } : null;
        })
        .filter((o): o is Observation => o != null)
        .sort(byDate);
      return { mode, series };
    }

    case 'exam_grade': {
      // Follows the retake chain: a goal bound to the first sitting keeps
      // tracking that exam, so passing it on the second attempt moves the bar.
      const all = await allExams(client, cache);
      const attempts = resolveAttempts(all);
      const countedId = attempts.get(metric.examId)?.countedId;
      const exam = countedId ? all.find((e) => e.id === countedId) : undefined;
      return {
        mode,
        series: exam?.grade != null ? [{ at: exam.exam_date, value: exam.grade }] : [],
      };
    }

    case 'subject_best_grade': {
      const exams = await gradedExams(client, cache);
      return {
        mode,
        series: exams
          .filter((e) => e.subject_id === metric.subjectId && e.grade != null)
          .map((e) => ({ at: e.exam_date, value: e.grade as number }))
          .sort(byDate),
      };
    }

    case 'subject_avg_grade':
    case 'overall_avg_grade': {
      const exams = await gradedExams(client, cache);
      const scoped =
        metric.kind === 'subject_avg_grade'
          ? exams.filter((e) => e.subject_id === metric.subjectId)
          : exams;
      const points = scoped
        .filter((e) => e.grade != null)
        .map((e) => ({ at: e.exam_date, value: e.grade as number }))
        .sort(byDate);
      return { mode, series: runningAverage(points) };
    }

    case 'study_hours':
    case 'study_session_count': {
      const rows = await memo(cache, 'study_sessions', async () => {
        const { data, error } = await client
          .from('study_sessions')
          .select('subject_id, started_at, duration_seconds')
          .order('started_at');
        if (error) throw error;
        return data ?? [];
      });
      const scoped = metric.subjectId
        ? rows.filter((r) => r.subject_id === metric.subjectId)
        : rows;
      return {
        mode,
        series: scoped.map((r) => ({
          at: r.started_at,
          value: metric.kind === 'study_hours' ? r.duration_seconds / 3600 : 1,
        })),
      };
    }

    case 'cards_done': {
      const rows = await memo(cache, 'cards_done', async () => {
        const { data, error } = await client
          .from('roadmap_cards')
          .select('board_id, status, done_at, updated_at')
          .eq('status', 'done');
        if (error) throw error;
        return data ?? [];
      });
      const scoped = metric.boardId ? rows.filter((r) => r.board_id === metric.boardId) : rows;
      return {
        mode,
        // done_at is null on cards finished before migration 0007 added it.
        series: scoped
          .map((r) => ({ at: r.done_at ?? r.updated_at, value: 1 }))
          .sort(byDate),
      };
    }

    case 'work_metric_value':
    case 'work_metric_total': {
      const rows = await memo(cache, 'work_metrics', async () => {
        const { data, error } = await client
          .from('work_metrics')
          .select('date, value, label')
          .order('date');
        if (error) throw error;
        return data ?? [];
      });
      const want = metric.label.toLowerCase();
      return {
        mode,
        series: rows
          .filter((r) => r.label.toLowerCase() === want)
          .map((r) => ({ at: r.date, value: r.value })),
      };
    }

    default: {
      // Exhaustiveness guard — a new kind in the union must be handled above.
      const never: never = metric;
      throw new Error(`Unhandled goal metric: ${JSON.stringify(never)}`);
    }
  }
}

/* ══ Turning a series into a goal's numbers ═══════════════════════════════ */

export interface ResolvedMilestone {
  id: string;
  label: string | null;
  value: number | null;
  completed: boolean;
  /** When the threshold was first crossed — derived for auto goals. */
  hitAt: string | null;
}

export interface ResolvedGoal {
  goal: Goal;
  milestones: ResolvedMilestone[];
  /** Latest observation (peak mode) or the running total (cumulative). */
  current: number | null;
  /** Best ever — what the bar's fill is allowed to hold at. */
  best: number | null;
  percent: number;
  achieved: boolean;
  /** Running series for the sparkline / trend chart. */
  progression: Observation[];
}

const crossed = (value: number, threshold: number, direction: GoalDirection) =>
  direction === 'down' ? value <= threshold : value >= threshold;

/**
 * The running value after each observation: a best-so-far for `peak`, a
 * total-so-far for `cumulative`. Everything else — the headline number, when a
 * milestone was first cleared, the chart — reads off this one array.
 */
export function progressionOf(
  series: Observation[],
  mode: AggregationMode,
  direction: GoalDirection,
): Observation[] {
  if (mode === 'cumulative') {
    let total = 0;
    return series.map((o) => {
      total += o.value;
      return { at: o.at, value: total };
    });
  }
  let best: number | null = null;
  return series.map((o) => {
    best =
      best == null ? o.value : direction === 'down' ? Math.min(best, o.value) : Math.max(best, o.value);
    return { at: o.at, value: best };
  });
}

export function resolveGoalProgress(
  goal: Goal,
  milestones: GoalMilestone[],
  { series, mode }: MetricSeries,
): ResolvedGoal {
  const direction = goal.direction;
  const progression = progressionOf(series, mode, direction);

  const best = progression.length ? progression[progression.length - 1].value : null;
  // `current` is where you are NOW, which is what makes a slip visible: in peak
  // mode the latest observation can sit below the best, and the bar holds while
  // the hollow marker moves back. A cumulative total can't regress.
  const current =
    mode === 'cumulative' ? best : series.length ? series[series.length - 1].value : null;

  const resolved: ResolvedMilestone[] = [...milestones]
    .sort((a, b) => a.position - b.position)
    .map((m) => {
      if (m.value == null) {
        // Tick-only: the stored flag is the whole truth, on any goal.
        return {
          id: m.id,
          label: m.label,
          value: null,
          completed: m.completed,
          hitAt: m.first_hit_at,
        };
      }
      // A numeric milestone clears itself once the history crosses it. The
      // stored flag is a floor, never a ceiling, so a manual tick still counts.
      const firstCross = progression.find((o) => crossed(o.value, m.value as number, direction));
      return {
        id: m.id,
        label: m.label,
        value: m.value,
        completed: m.completed || firstCross != null,
        hitAt: m.first_hit_at ?? firstCross?.at ?? null,
      };
    });

  const percent = percentOf(goal, resolved, best);

  return {
    goal,
    milestones: resolved,
    current,
    best,
    percent,
    achieved: goal.status === 'achieved' || percent >= 100,
    progression,
  };
}

/**
 * Mirrors GoalBar's geometry so the headline number can never disagree with the
 * fill: the bar reaches the furthest cleared milestone, or the live value,
 * whichever is further along.
 */
function percentOf(goal: Goal, milestones: ResolvedMilestone[], best: number | null): number {
  // `direction` needs no special case here: it is already encoded in the sign of
  // the start → target span, so a countdown goal normalizes with the same formula.
  const { start_value: start, target_value: target } = goal;
  const numeric = start != null && target != null && start !== target;

  if (!numeric) {
    const total = milestones.length || 1;
    let furthest = 0;
    milestones.forEach((m, i) => {
      if (m.completed) furthest = Math.max(furthest, (i + 1) / total);
    });
    return Math.round(furthest * 100);
  }

  const span = target - start;
  const norm = (v: number) => Math.min(1, Math.max(0, (v - start) / span));
  let fill = best != null ? norm(best) : 0;
  for (const m of milestones) {
    if (m.completed && m.value != null) fill = Math.max(fill, norm(m.value));
  }
  return Math.round(fill * 100);
}

/* ══ Reads ════════════════════════════════════════════════════════════════ */

export interface GoalWithMilestones {
  goal: Goal;
  milestones: GoalMilestone[];
}

export async function listGoals(
  client: Client,
  opts: { section?: GoalSection | null; status?: GoalStatus | null } = {},
): Promise<GoalWithMilestones[]> {
  let query = client.from('goals').select('*');
  if (opts.section) query = query.eq('section', opts.section);
  if (opts.status) query = query.eq('status', opts.status);

  const { data: goals, error } = await query
    .order('pinned', { ascending: false })
    .order('position')
    .order('created_at');
  if (error) throw error;
  if (!goals?.length) return [];

  const { data: milestones, error: msError } = await client
    .from('goal_milestones')
    .select('*')
    .in('goal_id', goals.map((g) => g.id))
    .order('position');
  if (msError) throw msError;

  const byGoal = new Map<string, GoalMilestone[]>();
  for (const m of milestones ?? []) {
    const list = byGoal.get(m.goal_id);
    if (list) list.push(m);
    else byGoal.set(m.goal_id, [m]);
  }

  return goals.map((goal) => ({ goal, milestones: byGoal.get(goal.id) ?? [] }));
}

/**
 * Every goal in a section with its bar's numbers already worked out. Resolution
 * runs in parallel behind a shared memo, so goals reading the same table (or the
 * same exercise) cost one round-trip between them, not one each.
 */
export async function listResolvedGoals(
  client: Client,
  opts: { section?: GoalSection | null; status?: GoalStatus | null } = { status: 'active' },
): Promise<ResolvedGoal[]> {
  const rows = await listGoals(client, opts);
  const cache: Memo = new Map();

  return Promise.all(
    rows.map(async ({ goal, milestones }) => {
      const source = await seriesForGoal(client, goal, cache);
      return resolveGoalProgress(goal, milestones, source);
    }),
  );
}

export async function getResolvedGoal(client: Client, id: string): Promise<ResolvedGoal | null> {
  const { data: goal, error } = await client.from('goals').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!goal) return null;

  const { data: milestones, error: msError } = await client
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', id)
    .order('position');
  if (msError) throw msError;

  const source = await seriesForGoal(client, goal, new Map());
  return resolveGoalProgress(goal, milestones ?? [], source);
}

/** Auto goals read the app; manual goals read their own check-ins. */
async function seriesForGoal(client: Client, goal: Goal, cache: Memo): Promise<MetricSeries> {
  if (goal.source === 'auto' && goal.metric) {
    try {
      return await resolveMetric(client, goal.metric as unknown as GoalMetric, cache);
    } catch {
      // A binding can go stale — a deleted exercise, a renamed work metric. The
      // goal should read as "no data yet", not take the whole page down.
      return { series: [], mode: 'peak' };
    }
  }

  const checkins = await memo(cache, `checkins:${goal.id}`, async () => {
    const { data, error } = await client
      .from('goal_checkins')
      .select('value, recorded_at')
      .eq('goal_id', goal.id)
      .order('recorded_at');
    if (error) throw error;
    return data ?? [];
  });

  return {
    mode: 'peak',
    series: checkins.map((c) => ({ at: c.recorded_at, value: c.value })),
  };
}

/* ══ Picker options ═══════════════════════════════════════════════════════ */

export interface MetricOption {
  id: string;
  name: string;
}

export interface MetricOptions {
  exercises: MetricOption[];
  subjects: MetricOption[];
  exams: MetricOption[];
  boards: MetricOption[];
  /** Distinct cardio activity names, as typed. */
  activities: string[];
  /** Distinct work_metrics labels — the escape-hatch series. */
  metricLabels: string[];
}

/**
 * Everything the create-goal metric picker needs to offer, in one round of
 * parallel reads. Each list degrades to empty on its own rather than failing the
 * form — a missing table should cost you one metric kind, not the whole screen.
 */
export async function listMetricOptions(client: Client): Promise<MetricOptions> {
  const [exercises, subjects, exams, boards, cardio, metrics] = await Promise.all([
    client.from('exercises').select('id, name').order('name').then((r) => r.data ?? []),
    client.from('subjects').select('id, name').order('name').then((r) => r.data ?? []),
    client
      .from('exams')
      .select('id, title, exam_date, subject_id')
      .order('exam_date', { ascending: false })
      .then((r) => r.data ?? []),
    client.from('work_boards').select('id, name').order('position').then((r) => r.data ?? []),
    client.from('cardio_entries').select('activity').then((r) => r.data ?? []),
    client.from('work_metrics').select('label').then((r) => r.data ?? []),
  ]);

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const distinct = (values: string[]) => {
    const seen = new Map<string, string>();
    for (const v of values) {
      const key = v.toLowerCase();
      if (!seen.has(key)) seen.set(key, v);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  };

  return {
    exercises,
    subjects,
    // An exam title is optional, so fall back to subject + date — "untitled" is
    // useless in a picker where every row has to be distinguishable.
    exams: exams.map((e) => ({
      id: e.id,
      name: e.title?.trim()
        ? `${e.title} · ${e.exam_date}`
        : `${subjectName.get(e.subject_id) ?? 'Exam'} · ${e.exam_date}`,
    })),
    boards,
    activities: distinct(cardio.map((c) => c.activity)),
    metricLabels: distinct(metrics.map((m) => m.label)),
  };
}

/* ══ Writes ═══════════════════════════════════════════════════════════════ */

export interface GoalInput {
  section: GoalSection;
  title: string;
  description?: string | null;
  unit?: string | null;
  start_value?: number | null;
  target_value?: number | null;
  direction?: GoalDirection;
  source?: 'manual' | 'auto';
  metric?: GoalMetric | null;
  deadline?: string | null;
  pinned?: boolean;
}

export interface MilestoneInput {
  label?: string | null;
  value?: number | null;
}

export async function createGoal(
  client: Client,
  input: GoalInput,
  milestones: MilestoneInput[] = [],
): Promise<Goal> {
  const { metric, ...rest } = input;
  const { data: goal, error } = await client
    .from('goals')
    .insert({
      ...rest,
      source: input.source ?? (metric ? 'auto' : 'manual'),
      metric: metric ? (metric as unknown as GoalMetricJson) : null,
    })
    .select()
    .single();
  if (error) throw error;

  if (milestones.length) await replaceMilestones(client, goal.id, milestones);
  return goal;
}

export async function updateGoal(
  client: Client,
  id: string,
  patch: Partial<GoalInput> & { status?: GoalStatus; position?: number },
): Promise<Goal> {
  const { metric, ...rest } = patch;
  const { data, error } = await client
    .from('goals')
    .update({
      ...rest,
      ...(metric !== undefined
        ? { metric: metric ? (metric as unknown as GoalMetricJson) : null }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Flip a goal onto the shelf. `achieved_at` is stamped once and kept. */
export async function setGoalStatus(
  client: Client,
  id: string,
  status: GoalStatus,
): Promise<Goal> {
  return updateGoal(client, id, {
    status,
    ...(status === 'achieved' ? { achieved_at: new Date().toISOString() } : {}),
  } as Partial<GoalInput> & { status: GoalStatus });
}

export async function deleteGoal(client: Client, id: string): Promise<void> {
  const { error } = await client.from('goals').delete().eq('id', id);
  if (error) throw error;
}

/** Milestones are edited as a set — simpler than diffing, and they're few. */
export async function replaceMilestones(
  client: Client,
  goalId: string,
  milestones: MilestoneInput[],
): Promise<GoalMilestone[]> {
  const { data: existing, error: readError } = await client
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId);
  if (readError) throw readError;

  // Carry the clear-state across an edit: a milestone keeps its tick and its
  // first_hit_at if its value (or label) still matches one that was there.
  const previous = new Map(
    (existing ?? []).map((m) => [`${m.value ?? ''}|${m.label ?? ''}`, m] as const),
  );

  const { error: deleteError } = await client
    .from('goal_milestones')
    .delete()
    .eq('goal_id', goalId);
  if (deleteError) throw deleteError;

  if (!milestones.length) return [];

  const { data, error } = await client
    .from('goal_milestones')
    .insert(
      milestones.map((m, i) => {
        const prior = previous.get(`${m.value ?? ''}|${m.label ?? ''}`);
        return {
          goal_id: goalId,
          label: m.label ?? null,
          value: m.value ?? null,
          position: i,
          completed: prior?.completed ?? false,
          first_hit_at: prior?.first_hit_at ?? null,
        };
      }),
    )
    .select();
  if (error) throw error;
  return data ?? [];
}

/**
 * Tick or un-tick a milestone by hand. `first_hit_at` is written the first time
 * and never cleared afterwards, so un-ticking a mistake still remembers when you
 * first got there — and a re-tick can't overwrite the original date.
 */
export async function setMilestoneCompleted(
  client: Client,
  id: string,
  completed: boolean,
): Promise<GoalMilestone> {
  const { data: existing, error: readError } = await client
    .from('goal_milestones')
    .select('first_hit_at')
    .eq('id', id)
    .single();
  if (readError) throw readError;

  const { data, error } = await client
    .from('goal_milestones')
    .update({
      completed,
      first_hit_at: existing.first_hit_at ?? (completed ? new Date().toISOString() : null),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addCheckin(
  client: Client,
  goalId: string,
  value: number,
  opts: { recorded_at?: string; note?: string | null } = {},
): Promise<GoalCheckin> {
  const { data, error } = await client
    .from('goal_checkins')
    .insert({ goal_id: goalId, value, ...opts })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCheckins(client: Client, goalId: string): Promise<GoalCheckin[]> {
  const { data, error } = await client
    .from('goal_checkins')
    .select('*')
    .eq('goal_id', goalId)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteCheckin(client: Client, id: string): Promise<void> {
  const { error } = await client.from('goal_checkins').delete().eq('id', id);
  if (error) throw error;
}
