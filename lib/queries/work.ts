import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, RoadmapCard, Note, RoadmapStatus, Priority } from '@/lib/db/types';

type Client = SupabaseClient<Database>;

export const workKeys = {
  all: ['work'] as const,
  cards: () => [...workKeys.all, 'cards'] as const,
  notes: (search?: string) => [...workKeys.all, 'notes', search ?? ''] as const,
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
  return data ?? [];
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
