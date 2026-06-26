import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, JournalWeek } from '@/lib/db/types';
import { mondayOf } from '@/lib/utils/stats';

type Client = SupabaseClient<Database>;

export const journalKeys = {
  all: ['journal'] as const,
  list: () => [...journalKeys.all, 'list'] as const,
};

export type JournalWeekInput = { week_start: string; content: string };

// --- DB queries ---

export async function listJournalWeeks(client: Client): Promise<JournalWeek[]> {
  const { data, error } = await client
    .from('journal_weeks')
    .select('*')
    .order('week_start', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertJournalWeek(
  client: Client,
  input: JournalWeekInput,
): Promise<JournalWeek> {
  const { data, error } = await client
    .from('journal_weeks')
    .upsert(
      { week_start: input.week_start, content: input.content.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteJournalWeek(client: Client, id: string): Promise<void> {
  const { error } = await client.from('journal_weeks').delete().eq('id', id);
  if (error) throw error;
}

// --- Pure helpers (no DB calls; all date math in UTC) ---

/** Monday of the week BEFORE today's week, as YYYY-MM-DD. */
export function targetWeekStart(today: Date = new Date()): string {
  const monday = mondayOf(today);
  const d = new Date(monday + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** The upcoming Monday (mondayOf(today) + 7 days) — when a currently-closed entry reopens. */
export function nextOpenMonday(today: Date = new Date()): string {
  const monday = mondayOf(today);
  const d = new Date(monday + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** True iff no summary row exists for the target week (last week). */
export function isEntryOpen(
  weeks: Pick<JournalWeek, 'week_start'>[],
  today: Date = new Date(),
): boolean {
  return !weeks.some((w) => w.week_start === targetWeekStart(today));
}

/** Format like "Jun 16 – Jun 22". */
export function weekRangeLabel(week_start: string): string {
  const monday = new Date(week_start + 'T00:00:00Z');
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/** Bucket weeks by the month of their week_start Monday. Input must be sorted desc. */
export function groupByMonth(
  weeks: JournalWeek[],
): { key: string; label: string; weeks: JournalWeek[] }[] {
  const order: string[] = [];
  const buckets = new Map<string, JournalWeek[]>();

  for (const w of weeks) {
    const d = new Date(w.week_start + 'T00:00:00Z');
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      order.push(key);
      buckets.set(key, []);
    }
    buckets.get(key)!.push(w);
  }

  return order.map((key) => {
    const d = new Date(key + '-01T00:00:00Z');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return { key, label, weeks: buckets.get(key)! };
  });
}

// --- Server-side aggregate ---

export async function getJournalHomeState(
  client: Client,
  today: Date = new Date(),
): Promise<{ entryOpen: boolean; targetWeekStart: string; nextOpenMonday: string }> {
  const weeks = await listJournalWeeks(client);
  return {
    entryOpen: isEntryOpen(weeks, today),
    targetWeekStart: targetWeekStart(today),
    nextOpenMonday: nextOpenMonday(today),
  };
}
