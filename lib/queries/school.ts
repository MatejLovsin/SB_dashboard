import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Subject, Exam, StudySession } from '@/lib/db/types';
import { mondayOf } from '@/lib/utils/stats';

type Client = SupabaseClient<Database>;

export const schoolKeys = {
  all: ['school'] as const,
  subjects: () => [...schoolKeys.all, 'subjects'] as const,
  exams: (filter?: { upcoming?: boolean }) => [...schoolKeys.all, 'exams', filter ?? {}] as const,
  examStudyHours: (examIds: string[]) => [...schoolKeys.all, 'studyHours', examIds] as const,
  studySessions: (subjectId: string) => [...schoolKeys.all, 'studySessions', subjectId] as const,
};

export type SubjectInput = { name: string; color?: string | null };
export type StudySessionInput = {
  subject_id: string;
  exam_id?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  note?: string | null;
};
export type ExamInput = {
  subject_id: string;
  title?: string | null;
  exam_date: string;
  perceived_difficulty?: number | null;
  grade?: number | null;
  target_study_hours?: number | null;
};

export type ExamWithSubject = Exam & { subject: Pick<Subject, 'name' | 'color'> | null };
export type ExamWithProgress = ExamWithSubject & { studySeconds: number };

// --- Subject CRUD ---

export async function listSubjects(client: Client): Promise<Subject[]> {
  const { data, error } = await client.from('subjects').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createSubject(client: Client, input: SubjectInput): Promise<Subject> {
  const { data, error } = await client
    .from('subjects')
    .insert({ name: input.name.trim(), color: input.color ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(
  client: Client,
  id: string,
  patch: Partial<SubjectInput>,
): Promise<Subject> {
  const { data, error } = await client
    .from('subjects')
    .update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(client: Client, id: string): Promise<void> {
  const { error } = await client.from('subjects').delete().eq('id', id);
  if (error) throw error;
}

// --- Exam CRUD ---

export async function listExams(
  client: Client,
  opts?: { upcoming?: boolean },
): Promise<ExamWithSubject[]> {
  let q = client.from('exams').select('*').order('exam_date', { ascending: true });
  if (opts?.upcoming) q = q.gte('exam_date', new Date().toISOString().slice(0, 10));
  const { data: rows, error: examsError } = await q;
  if (examsError) throw examsError;

  const exams = rows ?? [];
  if (exams.length === 0) return [];

  const subjectIds = [...new Set(exams.map((e) => e.subject_id))];
  const { data: subjects, error: subjectsError } = await client
    .from('subjects')
    .select('id, name, color')
    .in('id', subjectIds);
  if (subjectsError) throw subjectsError;

  const subMap = new Map((subjects ?? []).map((s) => [s.id, { name: s.name, color: s.color }]));
  return exams.map((exam) => ({ ...exam, subject: subMap.get(exam.subject_id) ?? null }));
}

export async function createExam(client: Client, input: ExamInput): Promise<Exam> {
  const { data, error } = await client
    .from('exams')
    .insert({
      subject_id: input.subject_id,
      title: input.title?.trim() ?? null,
      exam_date: input.exam_date,
      perceived_difficulty: input.perceived_difficulty ?? null,
      grade: input.grade ?? null,
      target_study_hours: input.target_study_hours ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateExam(
  client: Client,
  id: string,
  patch: Partial<ExamInput>,
): Promise<Exam> {
  type ExamUpdate = Database['public']['Tables']['exams']['Update'];
  const update: ExamUpdate = {};
  if (patch.subject_id !== undefined) update.subject_id = patch.subject_id;
  if (patch.title !== undefined) update.title = patch.title?.trim() ?? null;
  if (patch.exam_date !== undefined) update.exam_date = patch.exam_date;
  if (patch.perceived_difficulty !== undefined) update.perceived_difficulty = patch.perceived_difficulty;
  if (patch.grade !== undefined) update.grade = patch.grade;
  if (patch.target_study_hours !== undefined) update.target_study_hours = patch.target_study_hours;
  const { data, error } = await client
    .from('exams')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExam(client: Client, id: string): Promise<void> {
  const { error } = await client.from('exams').delete().eq('id', id);
  if (error) throw error;
}

// --- Study session CRUD ---

export async function listStudySessions(
  client: Client,
  subjectId: string,
): Promise<StudySession[]> {
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .eq('subject_id', subjectId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createStudySession(
  client: Client,
  input: StudySessionInput,
): Promise<StudySession> {
  const { data, error } = await client
    .from('study_sessions')
    .insert({
      subject_id: input.subject_id,
      exam_id: input.exam_id ?? null,
      started_at: input.started_at,
      ended_at: input.ended_at ?? null,
      duration_seconds: input.duration_seconds,
      note: input.note ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// --- Study hours aggregation ---

export async function getStudySecondsForExams(
  client: Client,
  examIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (examIds.length === 0) return map;
  const { data, error } = await client
    .from('study_sessions')
    .select('exam_id, duration_seconds')
    .in('exam_id', examIds);
  if (error) throw error;
  for (const row of data ?? []) {
    if (!row.exam_id) continue;
    map.set(row.exam_id, (map.get(row.exam_id) ?? 0) + row.duration_seconds);
  }
  return map;
}

export async function listUpcomingExamsWithProgress(
  client: Client,
): Promise<ExamWithProgress[]> {
  const exams = await listExams(client, { upcoming: true });
  const studyMap = await getStudySecondsForExams(client, exams.map((e) => e.id));
  return exams.map((exam) => ({ ...exam, studySeconds: studyMap.get(exam.id) ?? 0 }));
}

export async function listRecentStudySessions(
  client: Client,
  limit = 500,
): Promise<StudySession[]> {
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// --- Client-side aggregation helpers ---

export function weeklyStudyHoursSeries(
  sessions: StudySession[],
  weeks = 12,
): { label: string; value: number }[] {
  const today = new Date();
  const thisMonday = mondayOf(today);
  const buckets = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sessions) {
    const w = mondayOf(new Date(s.started_at));
    if (buckets.has(w)) buckets.set(w, (buckets.get(w) ?? 0) + s.duration_seconds);
  }
  return Array.from(buckets.entries()).map(([weekStart, secs]) => {
    const d = new Date(weekStart + 'T00:00:00Z');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { label, value: Math.round((secs / 3600) * 10) / 10 };
  });
}

export function studyHoursPerSubject(
  sessions: StudySession[],
  subjects: Subject[],
): { name: string; value: number }[] {
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    buckets.set(s.subject_id, (buckets.get(s.subject_id) ?? 0) + s.duration_seconds);
  }
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  return Array.from(buckets.entries())
    .map(([id, secs]) => ({
      name: subjectMap.get(id) ?? 'Unknown',
      value: Math.round((secs / 3600) * 10) / 10,
    }))
    .sort((a, b) => b.value - a.value);
}

export function studyHoursThisWeek(sessions: StudySession[]): number {
  const thisMonday = mondayOf(new Date()) + 'T00:00:00Z';
  let secs = 0;
  for (const s of sessions) {
    if (s.started_at >= thisMonday) secs += s.duration_seconds;
  }
  return Math.round((secs / 3600) * 10) / 10;
}

export function studyHoursPrevWeek(sessions: StudySession[]): number {
  const thisMondayMs = new Date(mondayOf(new Date()) + 'T00:00:00Z').getTime();
  const prevMondayMs = thisMondayMs - 7 * 86_400_000;
  let secs = 0;
  for (const s of sessions) {
    const t = new Date(s.started_at).getTime();
    if (t >= prevMondayMs && t < thisMondayMs) secs += s.duration_seconds;
  }
  return Math.round((secs / 3600) * 10) / 10;
}

export function studyStreakDays(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;
  const dates = new Set(sessions.map((s) => s.started_at.slice(0, 10)));
  let cursor = new Date().toISOString().slice(0, 10);
  if (!dates.has(cursor)) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    const d = new Date(cursor);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}
