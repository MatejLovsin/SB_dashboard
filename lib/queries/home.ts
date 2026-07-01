import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db/types';
import { volumeForSessionIds, deltaPercent, mondayOf } from '@/lib/utils/stats';

type Client = SupabaseClient<Database>;

export type HomeMetrics = {
  fitness: {
    volume30d: number;
    volumeDelta: number | null;
    weeklyVolumeSparkline: number[];
  };
  school: {
    hoursThisWeek: number;
    hoursDelta: number | null;
    weeklyHoursSparkline: number[];
  };
  work: {
    inProgressCount: number;
    notesPerWeekSparkline: number[];
  };
  // Longer-period "zoom out" stats for the home KPI strip — last 90 days vs the
  // prior 90, with a 13-week sparkline. Deliberately a wider lens than the link
  // cards below (which stay on 30d / this-week / current snapshot).
  longTerm: {
    fitnessVolume90d: number;
    fitnessVolumeDelta: number | null;
    fitnessVolumeSparkline: number[];
    schoolHours90d: number;
    schoolHoursDelta: number | null;
    schoolHoursSparkline: number[];
    workShipped90d: number;
    workShippedDelta: number | null;
    workShippedSparkline: number[];
  };
};

const DAY = 24 * 3600 * 1000;

export async function getHomeMetrics(client: Client): Promise<HomeMetrics> {
  const now = new Date();
  // Widened to 180 days so the longer-period KPIs can compare the last 90 days
  // against the prior 90; short-term stats below still filter in-memory.
  const oneEightyDaysAgo = new Date(now.getTime() - 180 * DAY);
  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * DAY).toISOString();
  const ninetyDaysAgoStr = new Date(now.getTime() - 90 * DAY).toISOString();
  const ninetyDaysAgoDate = ninetyDaysAgoStr.slice(0, 10);
  const oneEightyDaysAgoDate = oneEightyDaysAgo.toISOString().slice(0, 10);

  // --- Fitness: 30-day volume + delta + 8-week sparkline ---
  const { data: sessions } = await client
    .from('workout_sessions')
    .select('id, performed_at')
    .gte('performed_at', oneEightyDaysAgo.toISOString())
    .order('performed_at', { ascending: true });

  const sessionRows = sessions ?? [];
  let setRows: Array<{ session_id: string; reps: number | null; weight: number | null; completed: boolean }> = [];
  if (sessionRows.length > 0) {
    const { data: sets } = await client
      .from('session_sets')
      .select('session_id, reps, weight, completed')
      .in('session_id', sessionRows.map((s) => s.id));
    setRows = sets ?? [];
  }

  const current30dIds = new Set(
    sessionRows.filter((s) => s.performed_at >= thirtyDaysAgoStr).map((s) => s.id),
  );
  const prev30dIds = new Set(
    sessionRows
      .filter((s) => s.performed_at < thirtyDaysAgoStr && s.performed_at >= ninetyDaysAgoStr)
      .map((s) => s.id),
  );
  const volume30d = volumeForSessionIds(current30dIds, setRows);
  const volumePrev = volumeForSessionIds(prev30dIds, setRows);

  // Long-term: volume over last 90d vs prior 90d (90–180d ago).
  const cur90dIds = new Set(
    sessionRows.filter((s) => s.performed_at >= ninetyDaysAgoStr).map((s) => s.id),
  );
  const prior90dIds = new Set(
    sessionRows.filter((s) => s.performed_at < ninetyDaysAgoStr).map((s) => s.id),
  );
  const fitnessVolume90d = volumeForSessionIds(cur90dIds, setRows);
  const fitnessVolumePrior = volumeForSessionIds(prior90dIds, setRows);

  // --- School: this-week vs last-week hours + 8-week sparkline ---
  const { data: studySessions } = await client
    .from('study_sessions')
    .select('started_at, duration_seconds')
    .gte('started_at', oneEightyDaysAgo.toISOString());
  const studyRows = studySessions ?? [];

  const thisMonday = mondayOf(now);
  const prevMondayDate = new Date(thisMonday + 'T00:00:00Z');
  prevMondayDate.setUTCDate(prevMondayDate.getUTCDate() - 7);
  const prevMondayStr = prevMondayDate.toISOString().slice(0, 10);

  let thisWeekSec = 0;
  let prevWeekSec = 0;
  let cur90Sec = 0;
  let prior90Sec = 0;
  for (const row of studyRows) {
    const w = mondayOf(new Date(row.started_at));
    if (w === thisMonday) thisWeekSec += row.duration_seconds;
    else if (w === prevMondayStr) prevWeekSec += row.duration_seconds;
    if (row.started_at >= ninetyDaysAgoStr) cur90Sec += row.duration_seconds;
    else prior90Sec += row.duration_seconds;
  }
  const hoursThisWeek = Math.round(thisWeekSec / 360) / 10;
  const hoursPrevWeek = Math.round(prevWeekSec / 360) / 10;
  const schoolHours90d = Math.round(cur90Sec / 360) / 10;
  const schoolHoursPrior = Math.round(prior90Sec / 360) / 10;

  // --- Work: in-progress count + notes sparkline; long-term = cards shipped ---
  const [{ data: cards }, { data: notes }] = await Promise.all([
    client.from('roadmap_cards').select('status, done_at'),
    client
      .from('notes')
      .select('entry_date')
      .gte('entry_date', oneEightyDaysAgoDate),
  ]);
  const cardRows = cards ?? [];
  const inProgressCount = cardRows.filter((c) => c.status === 'in_progress').length;

  let workShipped90d = 0;
  let workShippedPrior = 0;
  const shippedDates: string[] = [];
  for (const c of cardRows) {
    if (!c.done_at) continue;
    const d = c.done_at.slice(0, 10);
    if (d < oneEightyDaysAgoDate) continue;
    if (c.done_at >= ninetyDaysAgoStr) workShipped90d += 1;
    else workShippedPrior += 1;
    shippedDates.push(c.done_at);
  }

  return {
    fitness: {
      volume30d,
      volumeDelta: deltaPercent(volume30d, volumePrev),
      weeklyVolumeSparkline: buildWeeklyVolumeSeries(sessionRows, setRows, 8),
    },
    school: {
      hoursThisWeek,
      hoursDelta: deltaPercent(hoursThisWeek, hoursPrevWeek),
      weeklyHoursSparkline: buildWeeklyStudyHours(studyRows, 8),
    },
    work: {
      inProgressCount,
      notesPerWeekSparkline: buildNotesPerWeek(notes ?? [], 8),
    },
    longTerm: {
      fitnessVolume90d,
      fitnessVolumeDelta: deltaPercent(fitnessVolume90d, fitnessVolumePrior),
      fitnessVolumeSparkline: buildWeeklyVolumeSeries(sessionRows, setRows, 13),
      schoolHours90d,
      schoolHoursDelta: deltaPercent(schoolHours90d, schoolHoursPrior),
      schoolHoursSparkline: buildWeeklyStudyHours(studyRows, 13),
      workShipped90d,
      workShippedDelta: deltaPercent(workShipped90d, workShippedPrior),
      workShippedSparkline: buildShippedPerWeek(shippedDates, 13),
    },
  };
}

function buildShippedPerWeek(doneAts: string[], weeks: number): number[] {
  const thisMonday = mondayOf(new Date());
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const ts of doneAts) {
    const w = mondayOf(new Date(ts));
    if (buckets.has(w)) buckets.set(w, (buckets.get(w) ?? 0) + 1);
  }
  return Array.from(buckets.values());
}

function buildWeeklyVolumeSeries(
  sessions: Array<{ id: string; performed_at: string }>,
  sets: Array<{ session_id: string; reps: number | null; weight: number | null; completed: boolean }>,
  weeks: number,
): number[] {
  const thisMonday = mondayOf(new Date());
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  const sessionWeek = new Map(
    sessions.map((s) => [s.id, mondayOf(new Date(s.performed_at))]),
  );
  for (const set of sets) {
    if (!set.completed || set.reps == null || set.weight == null) continue;
    const week = sessionWeek.get(set.session_id);
    if (week && buckets.has(week)) {
      buckets.set(week, (buckets.get(week) ?? 0) + set.reps * set.weight);
    }
  }
  return Array.from(buckets.values());
}

function buildWeeklyStudyHours(
  rows: Array<{ started_at: string; duration_seconds: number }>,
  weeks: number,
): number[] {
  const thisMonday = mondayOf(new Date());
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const w = mondayOf(new Date(row.started_at));
    if (buckets.has(w)) buckets.set(w, (buckets.get(w) ?? 0) + row.duration_seconds);
  }
  return Array.from(buckets.values()).map((v) => Math.round(v / 360) / 10);
}

function buildNotesPerWeek(rows: Array<{ entry_date: string }>, weeks: number): number[] {
  const thisMonday = mondayOf(new Date());
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const w = mondayOf(new Date(row.entry_date + 'T00:00:00Z'));
    if (buckets.has(w)) buckets.set(w, (buckets.get(w) ?? 0) + 1);
  }
  return Array.from(buckets.values());
}
