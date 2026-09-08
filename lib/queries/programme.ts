// Weekly programme — the training split pinned to the top of /fitness.
//
// The table holds exactly 7 rows per user, one per ISO weekday (1=Mon .. 7=Sun),
// so "what am I training today?" is a weekday lookup with no cycle math. A row
// with a null `label` is a rest day. See supabase/migrations/0015_programme.sql
// for why `items` (the shorthand chip list) is decoupled from `plan_id`.

import type { ProgrammeDay, ProgrammeItem } from '@/lib/db/types';
import type { Client } from './fitness';

export const programmeKeys = {
  all: ['programme'] as const,
  days: () => [...programmeKeys.all, 'days'] as const,
};

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEKDAY_FULL = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

/** ISO weekday for a date: 1 = Monday … 7 = Sunday (JS `getDay()` puts Sunday at 0). */
export function isoWeekday(date = new Date()): number {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday - 1] ?? '';
}

export function weekdayFull(weekday: number): string {
  return WEEKDAY_FULL[weekday - 1] ?? '';
}

/** A day plus the name of its linked plan, so the strip can show the connection. */
export type ProgrammeDayWithPlan = ProgrammeDay & { planName: string | null };

/**
 * All 7 days in weekday order, each carrying its linked plan's name. Rows missing
 * from the DB (e.g. the migration ran before this user existed) are backfilled in
 * memory as rest days so the strip always renders a full week, not a ragged one.
 */
export async function listProgrammeDays(client: Client): Promise<ProgrammeDayWithPlan[]> {
  const { data, error } = await client
    .from('programme_days')
    .select('*')
    .order('weekday');
  if (error) throw error;

  // Resolve plan names in one round-trip rather than an embedded join, so a
  // deleted-but-still-referenced plan can't fail the whole strip.
  const planIds = [...new Set((data ?? []).map((d) => d.plan_id).filter((id): id is string => !!id))];
  const nameById = new Map<string, string>();
  if (planIds.length > 0) {
    const { data: plans } = await client.from('workout_plans').select('id, name').in('id', planIds);
    for (const plan of plans ?? []) nameById.set(plan.id, plan.name);
  }

  const byWeekday = new Map((data ?? []).map((d) => [d.weekday, d]));
  return Array.from({ length: 7 }, (_, i) => {
    const weekday = i + 1;
    const row = byWeekday.get(weekday);
    if (!row) {
      return {
        id: `placeholder-${weekday}`,
        user_id: '',
        weekday,
        label: null,
        plan_id: null,
        items: [] as ProgrammeItem[],
        created_at: '',
        updated_at: '',
        planName: null,
      };
    }
    return { ...row, planName: row.plan_id ? (nameById.get(row.plan_id) ?? null) : null };
  });
}

export type ProgrammeDayPatch = {
  label?: string | null;
  plan_id?: string | null;
  items?: ProgrammeItem[];
};

/**
 * Upsert by (user_id, weekday) rather than update-by-id, so a day the migration
 * never seeded still saves instead of silently updating zero rows.
 */
export async function upsertProgrammeDay(
  client: Client,
  weekday: number,
  patch: ProgrammeDayPatch,
): Promise<ProgrammeDay> {
  const { data, error } = await client
    .from('programme_days')
    .upsert(
      { weekday, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,weekday' },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Move a day's content (label + plan + chips) to another weekday, swapping with
 * whatever sat there. Reordering the split never inserts or deletes rows — the
 * 7 weekday slots are fixed and only their contents move.
 */
export async function swapProgrammeDays(
  client: Client,
  a: ProgrammeDay,
  b: ProgrammeDay,
): Promise<void> {
  await upsertProgrammeDay(client, a.weekday, {
    label: b.label,
    plan_id: b.plan_id,
    items: b.items,
  });
  await upsertProgrammeDay(client, b.weekday, {
    label: a.label,
    plan_id: a.plan_id,
    items: a.items,
  });
}
