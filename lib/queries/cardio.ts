// Cardio logging: a session holds one or more entries (one per machine/activity).
// Intensity is a universal 1-10 RPE score so it's comparable across activities that
// expose different (or no) machine stats — see AGENTS.md / PROGRESS.md for the design
// rationale. This file mirrors the create-then-insert-children pattern used for
// workout sessions in lib/queries/sessions.ts.

import type { Database, CardioSession, CardioEntry } from '@/lib/db/types';
import type { Client } from './fitness';

export type CardioSessionWithEntries = {
  session: CardioSession;
  entries: CardioEntry[];
};

export type CardioEntryInput = {
  activity: string;
  duration_minutes: number;
  intensity: number;
  distance_km?: number | null;
  notes?: string | null;
};

export type CardioSessionInput = {
  performed_at?: string;
  notes?: string | null;
  entries: CardioEntryInput[];
};

export const cardioKeys = {
  all: ['cardio'] as const,
  sessions: () => [...cardioKeys.all, 'sessions'] as const,
  session: (id: string) => [...cardioKeys.all, 'session', id] as const,
  recentActivities: () => [...cardioKeys.all, 'recent-activities'] as const,
  activityLibrary: () => [...cardioKeys.all, 'activity-library'] as const,
  activityHistory: (activity: string) => [...cardioKeys.all, 'activity-history', activity.toLowerCase()] as const,
};

// Recent activity names typed in past entries, most-recent-first and de-duplicated —
// used to power quick-select suggestion chips so common activities don't need retyping.
export async function listRecentActivityNames(client: Client, count = 8): Promise<string[]> {
  const { data, error } = await client
    .from('cardio_entries')
    .select('activity')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;

  const seen = new Set<string>();
  const names: string[] = [];
  for (const row of data ?? []) {
    const name = row.activity.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
    if (names.length === count) break;
  }
  return names;
}

export async function createCardioSession(
  client: Client,
  input: CardioSessionInput,
): Promise<CardioSessionWithEntries> {
  const { data: session, error: sessionError } = await client
    .from('cardio_sessions')
    .insert({
      ...(input.performed_at ? { performed_at: input.performed_at } : {}),
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select('*')
    .single();
  if (sessionError) throw sessionError;

  const rows: Database['public']['Tables']['cardio_entries']['Insert'][] = input.entries.map(
    (entry, position) => ({
      session_id: session.id,
      activity: entry.activity.trim(),
      position,
      duration_minutes: entry.duration_minutes,
      intensity: entry.intensity,
      distance_km: entry.distance_km ?? null,
      notes: entry.notes?.trim() ? entry.notes.trim() : null,
    }),
  );

  let entries: CardioEntry[] = [];
  if (rows.length > 0) {
    const { data, error: entriesError } = await client.from('cardio_entries').insert(rows).select('*');
    if (entriesError) throw entriesError;
    entries = (data ?? []).sort((a, b) => a.position - b.position);
  }

  return { session, entries };
}

export async function getCardioSessionWithEntries(
  client: Client,
  sessionId: string,
): Promise<CardioSessionWithEntries> {
  const [{ data: session, error: sessionError }, { data: entries, error: entriesError }] =
    await Promise.all([
      client.from('cardio_sessions').select('*').eq('id', sessionId).single(),
      client
        .from('cardio_entries')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true }),
    ]);
  if (sessionError) throw sessionError;
  if (entriesError) throw entriesError;
  return { session, entries: entries ?? [] };
}

export async function listCardioSessions(
  client: Client,
  limit = 30,
): Promise<CardioSessionWithEntries[]> {
  const { data: sessions, error: sessionsError } = await client
    .from('cardio_sessions')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(limit);
  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  const { data: entries, error: entriesError } = await client
    .from('cardio_entries')
    .select('*')
    .in('session_id', sessions.map((s) => s.id))
    .order('position', { ascending: true });
  if (entriesError) throw entriesError;

  const bySession = new Map<string, CardioEntry[]>();
  for (const entry of entries ?? []) {
    const list = bySession.get(entry.session_id) ?? [];
    list.push(entry);
    bySession.set(entry.session_id, list);
  }
  return sessions.map((session) => ({ session, entries: bySession.get(session.id) ?? [] }));
}

export async function deleteCardioSession(client: Client, sessionId: string): Promise<void> {
  const { error } = await client.from('cardio_sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function updateCardioSession(
  client: Client,
  sessionId: string,
  patch: { performed_at?: string; notes?: string | null },
): Promise<CardioSession> {
  const { data, error } = await client
    .from('cardio_sessions')
    .update(patch)
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export type CardioEntryPatch = Partial<{
  activity: string;
  duration_minutes: number;
  intensity: number;
  distance_km: number | null;
  notes: string | null;
  position: number;
}>;

export async function updateCardioEntry(
  client: Client,
  entryId: string,
  patch: CardioEntryPatch,
): Promise<CardioEntry> {
  const { data, error } = await client
    .from('cardio_entries')
    .update(patch)
    .eq('id', entryId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function addCardioEntry(
  client: Client,
  sessionId: string,
  position: number,
  entry: CardioEntryInput,
): Promise<CardioEntry> {
  const { data, error } = await client
    .from('cardio_entries')
    .insert({
      session_id: sessionId,
      activity: entry.activity.trim(),
      position,
      duration_minutes: entry.duration_minutes,
      intensity: entry.intensity,
      distance_km: entry.distance_km ?? null,
      notes: entry.notes?.trim() ? entry.notes.trim() : null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCardioEntry(client: Client, entryId: string): Promise<void> {
  const { error } = await client.from('cardio_entries').delete().eq('id', entryId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Activity analytics — per-activity library + drill-down history, mirroring
// getExerciseLibrary/getExerciseHistory in analytics.ts but for cardio_entries
// grouped by (case-insensitive) activity name instead of a fixed exercise_id.
// ---------------------------------------------------------------------------

export type CardioActivityEntry = {
  key: string; // lowercased, for stable identity
  name: string; // most-recent casing seen
  entryCount: number;
  avgIntensity: number; // rounded to 1 decimal
  totalDurationMinutes: number;
  lastPerformed: string | null;
  sparkline: number[]; // intensity, oldest→newest, last 8
};

export async function getCardioActivityLibrary(client: Client): Promise<CardioActivityEntry[]> {
  const { data: entries, error: entriesError } = await client
    .from('cardio_entries')
    .select('activity, session_id, duration_minutes, intensity');
  if (entriesError) throw entriesError;
  if (!entries || entries.length === 0) return [];

  const { data: sessions, error: sessionsError } = await client
    .from('cardio_sessions')
    .select('id, performed_at');
  if (sessionsError) throw sessionsError;
  const performedAt = new Map((sessions ?? []).map((s) => [s.id, s.performed_at]));

  type Row = { key: string; name: string; performedAt: string; duration_minutes: number; intensity: number };
  const rows: Row[] = [];
  for (const e of entries) {
    const iso = performedAt.get(e.session_id);
    if (!iso) continue;
    const name = e.activity.trim();
    if (!name) continue;
    rows.push({ key: name.toLowerCase(), name, performedAt: iso, duration_minutes: Number(e.duration_minutes), intensity: e.intensity });
  }

  const byKey = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byKey.get(row.key) ?? [];
    list.push(row);
    byKey.set(row.key, list);
  }

  const result: CardioActivityEntry[] = [];
  for (const [key, list] of byKey) {
    list.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
    const entryCount = list.length;
    const totalDurationMinutes = Math.round(list.reduce((s, r) => s + r.duration_minutes, 0));
    const avgIntensity = Math.round((list.reduce((s, r) => s + r.intensity, 0) / entryCount) * 10) / 10;
    const lastPerformed = list[list.length - 1].performedAt;
    const name = list[list.length - 1].name; // most-recent casing
    const sparkline = list.slice(-8).map((r) => r.intensity);
    result.push({ key, name, entryCount, avgIntensity, totalDurationMinutes, lastPerformed, sparkline });
  }

  return result.sort((a, b) => {
    if (b.entryCount !== a.entryCount) return b.entryCount - a.entryCount;
    return a.name.localeCompare(b.name);
  });
}

export type CardioActivityHistoryPoint = {
  entry: CardioEntry;
  sessionId: string;
  performedAt: string;
};

// Full history for one activity (case-insensitive match), oldest→newest.
export async function getCardioActivityHistory(
  client: Client,
  activityName: string,
): Promise<CardioActivityHistoryPoint[]> {
  const { data: entries, error: entriesError } = await client
    .from('cardio_entries')
    .select('*')
    .ilike('activity', activityName);
  if (entriesError) throw entriesError;
  if (!entries || entries.length === 0) return [];

  const sessionIds = [...new Set(entries.map((e) => e.session_id))];
  const { data: sessions, error: sessionsError } = await client
    .from('cardio_sessions')
    .select('id, performed_at')
    .in('id', sessionIds);
  if (sessionsError) throw sessionsError;
  const performedAt = new Map((sessions ?? []).map((s) => [s.id, s.performed_at]));

  const points: CardioActivityHistoryPoint[] = entries
    .map((entry) => {
      const iso = performedAt.get(entry.session_id);
      if (!iso) return null;
      return { entry, sessionId: entry.session_id, performedAt: iso };
    })
    .filter((p): p is CardioActivityHistoryPoint => p !== null);

  return points.sort((a, b) => a.performedAt.localeCompare(b.performedAt));
}
