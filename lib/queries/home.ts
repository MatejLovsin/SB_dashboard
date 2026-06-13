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
};

export async function getHomeMetrics(client: Client): Promise<HomeMetrics> {
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 3600 * 1000);
  const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  // --- Fitness: 30-day volume + delta + 8-week sparkline ---
  const { data: sessions } = await client
    .from('workout_sessions')
    .select('id, performed_at')
    .gte('performed_at', sixtyDaysAgo.toISOString())
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
    sessionRows.filter((s) => s.performed_at < thirtyDaysAgoStr).map((s) => s.id),
  );
  const volume30d = volumeForSessionIds(current30dIds, setRows);
  const volumePrev = volumeForSessionIds(prev30dIds, setRows);

  // --- School: this-week vs last-week hours + 8-week sparkline ---
  const { data: studySessions } = await client
    .from('study_sessions')
    .select('started_at, duration_seconds')
    .gte('started_at', eightWeeksAgo.toISOString());
  const studyRows = studySessions ?? [];

  const thisMonday = mondayOf(now);
  const prevMondayDate = new Date(thisMonday + 'T00:00:00Z');
  prevMondayDate.setUTCDate(prevMondayDate.getUTCDate() - 7);
  const prevMondayStr = prevMondayDate.toISOString().slice(0, 10);

  let thisWeekSec = 0;
  let prevWeekSec = 0;
  for (const row of studyRows) {
    const w = mondayOf(new Date(row.started_at));
    if (w === thisMonday) thisWeekSec += row.duration_seconds;
    else if (w === prevMondayStr) prevWeekSec += row.duration_seconds;
  }
  const hoursThisWeek = Math.round(thisWeekSec / 360) / 10;
  const hoursPrevWeek = Math.round(prevWeekSec / 360) / 10;

  // --- Work: in-progress card count + notes-per-week sparkline ---
  const [{ data: cards }, { data: notes }] = await Promise.all([
    client.from('roadmap_cards').select('status'),
    client
      .from('notes')
      .select('entry_date')
      .gte('entry_date', eightWeeksAgo.toISOString().slice(0, 10)),
  ]);
  const inProgressCount = (cards ?? []).filter((c) => c.status === 'in_progress').length;

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
  };
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
