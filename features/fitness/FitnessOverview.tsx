import { createClient } from '@/lib/supabase/server';
import { listSessions, getSessionSetsBySessionIds } from '@/lib/queries/analytics';
import { getBodyMetrics } from '@/lib/queries/fitness';
import {
  sessionsPerWeek,
  currentStreakWeeks,
  findStalledExercises,
  weeklyVolumeSeries,
  categorySplit,
  deltaPercent,
  volumeForSessionIds,
  bestSetE1RM,
} from '@/lib/utils/stats';
import type { SessionSet } from '@/lib/db/types';
import dynamic from 'next/dynamic';
import { StatTile } from '@/components/ui/StatTile';
import { ChartCard } from '@/components/charts/ChartCard';
import { BodyweightLogger } from './BodyweightLogger';
import { AlertTriangle } from 'lucide-react';
import type { AreaTrendPoint } from '@/components/charts/AreaTrend';
import type { BarPoint } from '@/components/charts/BarCluster';
import type { DonutSlice } from '@/components/charts/DonutStat';

const AreaTrendChart = dynamic(() =>
  import('@/components/charts/AreaTrend').then((m) => m.AreaTrend),
);
const BarClusterChart = dynamic(() =>
  import('@/components/charts/BarCluster').then((m) => m.BarCluster),
);
const DonutStatChart = dynamic(() =>
  import('@/components/charts/DonutStat').then((m) => m.DonutStat),
);

function ninetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

function fmtVol(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return `${v}`;
}

export async function FitnessOverview() {
  const supabase = await createClient();

  const [sessions, bodyMetricsRaw] = await Promise.all([
    listSessions(supabase, { from: ninetyDaysAgo() }),
    getBodyMetrics(supabase, 60).catch(() => []),
  ]);

  const sets = await getSessionSetsBySessionIds(
    supabase,
    sessions.map((s) => s.id),
  );

  // ── KPI ──────────────────────────────────────────────────────────────────
  const weekBuckets14 = sessionsPerWeek(sessions, 14);
  const thisWeekCount = weekBuckets14[weekBuckets14.length - 1]?.count ?? 0;
  const lastWeekCount = weekBuckets14[weekBuckets14.length - 2]?.count ?? 0;
  const sessionsDelta = deltaPercent(thisWeekCount, lastWeekCount);

  const streak = currentStreakWeeks(sessions);

  const now = Date.now();
  const ms30 = 30 * 24 * 3600 * 1000;
  const sessions30d = new Set(
    sessions.filter((s) => now - new Date(s.performed_at).getTime() < ms30).map((s) => s.id),
  );
  const sessions30_60d = new Set(
    sessions
      .filter((s) => {
        const age = now - new Date(s.performed_at).getTime();
        return age >= ms30 && age < 2 * ms30;
      })
      .map((s) => s.id),
  );
  const vol30d = volumeForSessionIds(sessions30d, sets);
  const vol30_60d = volumeForSessionIds(sessions30_60d, sets);
  const volDelta = deltaPercent(vol30d, vol30_60d);
  const bestE1RM = Math.round(bestSetE1RM(sets));

  // ── Chart data ────────────────────────────────────────────────────────────
  const volSeries = weeklyVolumeSeries(sessions, sets, 12);

  const weekBuckets12 = sessionsPerWeek(sessions, 12);
  const sessionBars: BarPoint[] = weekBuckets12.map((b) => ({
    label: new Date(b.weekStart + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    value: b.count,
  }));

  const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
  const exerciseCategories = new Map<string, string | null>();
  const exerciseNames = new Map<string, string>();
  if (exerciseIds.length > 0) {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, category')
      .in('id', exerciseIds);
    for (const row of data ?? []) {
      exerciseCategories.set(row.id, row.category);
      exerciseNames.set(row.id, row.name);
    }
  }

  const catSplit: DonutSlice[] = categorySplit(sets, exerciseCategories);
  const catTotal = catSplit.reduce((s, c) => s + c.value, 0);
  const topCatPct =
    catSplit.length > 0 && catTotal > 0
      ? Math.round((catSplit[0].value / catTotal) * 100)
      : 0;

  // Stalled exercises
  const byExercise = new Map<string, Array<{ performed_at: string; sets: SessionSet[] }>>();
  const sessionDateById = new Map(sessions.map((s) => [s.id, s.performed_at]));
  for (const set of sets) {
    const performed_at = sessionDateById.get(set.session_id);
    if (!performed_at) continue;
    let hist = byExercise.get(set.exercise_id);
    if (!hist) { hist = []; byExercise.set(set.exercise_id, hist); }
    let entry = hist.find((h) => h.performed_at === performed_at);
    if (!entry) { entry = { performed_at, sets: [] }; hist.push(entry); }
    entry.sets.push(set);
  }
  const stalled = findStalledExercises(byExercise, exerciseNames);

  // Bodyweight chart points
  const bodyPoints: AreaTrendPoint[] = bodyMetricsRaw.map((m) => ({
    label: new Date(m.recorded_at + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    value: Number(m.weight_kg),
  }));

  return (
    <div className="space-y-4">
      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="stagger-fade grid grid-cols-2 gap-3">
        <StatTile
          label="Sessions"
          value={thisWeekCount}
          delta={sessionsDelta}
          caption="this week"
        />
        <StatTile label="Streak" value={streak} unit="wk" />
        <StatTile
          label="Volume 30d"
          value={fmtVol(vol30d)}
          unit="kg"
          delta={volDelta}
        />
        <StatTile
          label="Best 1RM"
          value={bestE1RM > 0 ? fmtVol(bestE1RM) : '—'}
          unit={bestE1RM > 0 ? 'kg' : undefined}
        />
      </div>

      {/* ── Hero: weekly volume ────────────────────────────────────────────── */}
      <ChartCard
        title="Weekly volume"
        value={`${fmtVol(vol30d)} kg`}
        action={
          volDelta !== null ? (
            <span
              className="text-xs font-semibold nums px-2 py-1 rounded-full"
              style={{
                color: volDelta >= 0 ? 'var(--up)' : 'var(--down)',
                background: volDelta >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
              }}
            >
              {volDelta >= 0 ? '+' : ''}{Math.round(volDelta)}% vs prev
            </span>
          ) : undefined
        }
      >
        <AreaTrendChart
          data={volSeries}
          height={220}
          compact
          unit="kg"
          name="volume"
        />
      </ChartCard>

      {/* ── Sessions / week ───────────────────────────────────────────────── */}
      <ChartCard title="Sessions / week">
        <BarClusterChart
          data={sessionBars}
          height={160}
          integer
          graded
          name="sessions"
        />
      </ChartCard>

      {/* ── Category split ────────────────────────────────────────────────── */}
      {catSplit.length > 0 && (
        <ChartCard title="Volume by category">
          <DonutStatChart
            data={catSplit}
            centerValue={`${topCatPct}%`}
            centerLabel={catSplit[0]?.name}
            height={160}
          />
        </ChartCard>
      )}

      {/* ── Bodyweight tracker ────────────────────────────────────────────── */}
      <BodyweightLogger initialPoints={bodyPoints} />

      {/* ── Stalled exercises ─────────────────────────────────────────────── */}
      <div className="panel rounded-2xl p-5">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted">
          Stalled exercises
        </span>
        {stalled.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No stalled exercises — keep it up.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {stalled.map((ex) => (
              <li
                key={ex.exercise_id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: 'var(--down)' }}
                  />
                  <span className="truncate font-medium">{ex.name}</span>
                </span>
                <span className="shrink-0 nums text-muted">
                  {ex.lastWeight} kg × {ex.lastReps}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
