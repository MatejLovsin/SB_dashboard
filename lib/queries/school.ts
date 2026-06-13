import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Subject, Exam, StudySession } from '@/lib/db/types';

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
