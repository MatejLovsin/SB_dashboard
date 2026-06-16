import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, RoadmapCard, Note, WorkMetric, RoadmapStatus, Priority } from '@/lib/db/types';
import type { BarPoint } from '@/components/charts/BarCluster';
import type { DonutSlice } from '@/components/charts/DonutStat';
import type { AreaTrendPoint } from '@/components/charts/AreaTrend';
import { mondayOf } from '@/lib/utils/stats';

type Client = SupabaseClient<Database>;

export const workKeys = {
  all: ['work'] as const,
  cards: () => [...workKeys.all, 'cards'] as const,
  notes: (search?: string) => [...workKeys.all, 'notes', search ?? ''] as const,
  metrics: () => [...workKeys.all, 'metrics'] as const,
};

export type CardInput = {
  title: string;
  description?: string | null;
  status?: RoadmapStatus;
  priority?: Priority | null;
};

export type NoteInput = {
  title: string;
  body?: string | null;
  entry_date?: string;
};

// --- Roadmap cards ---

export async function listCards(client: Client): Promise<RoadmapCard[]> {
  const { data, error } = await client
    .from('roadmap_cards')
    .select('*')
    .order('status')
    .order('position');
  if (error) throw error;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (data ?? []).filter((card) => {
    if (card.status !== 'done') return true;
    // done cards without a timestamp are kept (pre-migration rows)
    if (!card.done_at) return true;
    return new Date(card.done_at).getTime() > oneWeekAgo;
  });
}

export async function createCard(client: Client, input: CardInput): Promise<RoadmapCard> {
  const { data: existing } = await client
    .from('roadmap_cards')
    .select('position')
    .eq('status', input.status ?? 'idea')
    .order('position', { ascending: false })
    .limit(1);
  const maxPos = existing?.[0]?.position ?? -1;

  const { data, error } = await client
    .from('roadmap_cards')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      status: input.status ?? 'idea',
      priority: input.priority ?? null,
      position: maxPos + 1,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateCard(
  client: Client,
  id: string,
  patch: Partial<CardInput & { position: number }>,
): Promise<RoadmapCard> {
  type CardUpdate = Database['public']['Tables']['roadmap_cards']['Update'];
  const update: CardUpdate = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.description !== undefined) update.description = patch.description?.trim() ?? null;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.priority !== undefined) update.priority = patch.priority ?? undefined;
  if (patch.position !== undefined) update.position = patch.position;

  const { data, error } = await client
    .from('roadmap_cards')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCard(client: Client, id: string): Promise<void> {
  const { error } = await client.from('roadmap_cards').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCards(
  client: Client,
  updates: Array<{ id: string; position: number }>,
): Promise<void> {
  await Promise.all(
    updates.map(({ id, position }) =>
      client.from('roadmap_cards').update({ position }).eq('id', id),
    ),
  );
}

// --- Notes ---

export async function listNotes(client: Client, search?: string): Promise<Note[]> {
  let q = client
    .from('notes')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (search?.trim()) {
    q = q.textSearch('search', search.trim(), { type: 'websearch' });
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createNote(client: Client, input: NoteInput): Promise<Note> {
  const { data, error } = await client
    .from('notes')
    .insert({
      title: input.title.trim(),
      body: input.body?.trim() ?? null,
      entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  client: Client,
  id: string,
  patch: Partial<NoteInput>,
): Promise<Note> {
  type NoteUpdate = Database['public']['Tables']['notes']['Update'];
  const update: NoteUpdate = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.body !== undefined) update.body = patch.body?.trim() ?? null;
  if (patch.entry_date !== undefined) update.entry_date = patch.entry_date;

  const { data, error } = await client
    .from('notes')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote(client: Client, id: string): Promise<void> {
  const { error } = await client.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// --- Aggregations (pure, no DB call) ---

export function cardsByStatus(cards: RoadmapCard[]): DonutSlice[] {
  const counts: Record<RoadmapStatus, number> = { idea: 0, planned: 0, in_progress: 0, done: 0 };
  for (const c of cards) counts[c.status]++;
  const labels: Record<RoadmapStatus, string> = {
    idea: 'Idea',
    planned: 'Planned',
    in_progress: 'In Progress',
    done: 'Done',
  };
  return (Object.keys(counts) as RoadmapStatus[])
    .filter((s) => counts[s] > 0)
    .map((s) => ({ name: labels[s], value: counts[s] }));
}

export function cardsByPriority(cards: RoadmapCard[]): BarPoint[] {
  const counts: Record<Priority, number> = { low: 0, medium: 0, high: 0 };
  for (const c of cards) if (c.priority) counts[c.priority]++;
  const labels: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };
  return (Object.keys(counts) as Priority[]).map((p) => ({ label: labels[p], value: counts[p] }));
}

export function notesPerWeek(notes: Note[], weeks = 8): AreaTrendPoint[] {
  const points: AreaTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const anchor = new Date(Date.now() - i * 7 * 86400_000);
    const mondayStr = mondayOf(anchor);
    const mondayDate = new Date(mondayStr + 'T00:00:00Z');
    const sundayStr = new Date(mondayDate.getTime() + 6 * 86400_000).toISOString().slice(0, 10);
    const label = mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const value = notes.filter((n) => n.entry_date >= mondayStr && n.entry_date <= sundayStr).length;
    points.push({ label, value });
  }
  return points;
}

// --- Work metrics ---

export async function listWorkMetrics(client: Client, weeks = 8): Promise<WorkMetric[]> {
  const since = new Date(Date.now() - weeks * 7 * 86400_000).toISOString().slice(0, 10);
  const { data, error } = await client
    .from('work_metrics')
    .select('*')
    .gte('date', since)
    .order('date');
  if (error) throw error;
  return data ?? [];
}

export async function upsertWorkMetric(
  client: Client,
  date: string,
  value: number,
  label = 'focus score',
): Promise<WorkMetric> {
  const { data, error } = await client
    .from('work_metrics')
    .upsert({ date, value, label }, { onConflict: 'user_id,date,label' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function focusScoreSeries(metrics: WorkMetric[], weeks = 8): AreaTrendPoint[] {
  const points: AreaTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const anchor = new Date(Date.now() - i * 7 * 86400_000);
    const mondayStr = mondayOf(anchor);
    const mondayDate = new Date(mondayStr + 'T00:00:00Z');
    const sundayStr = new Date(mondayDate.getTime() + 6 * 86400_000).toISOString().slice(0, 10);
    const label = mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const weekMetrics = metrics.filter((m) => m.date >= mondayStr && m.date <= sundayStr);
    const avg =
      weekMetrics.length > 0
        ? Math.round((weekMetrics.reduce((s, m) => s + Number(m.value), 0) / weekMetrics.length) * 10) / 10
        : 0;
    points.push({ label, value: avg });
  }
  return points;
}
