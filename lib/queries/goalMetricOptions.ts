// The create-goal metric picker's lists. Split from goals.ts: these are the
// names a goal can bind to, not anything a goal resolves.

import type { Client } from './fitness';
import { fetchAll } from './fetchAll';

export interface MetricOption {
  id: string;
  name: string;
}

export interface MetricOptions {
  exercises: MetricOption[];
  subjects: MetricOption[];
  exams: MetricOption[];
  boards: MetricOption[];
  /** Distinct cardio activity names, as typed. */
  activities: string[];
  /** Distinct work_metrics labels — the escape-hatch series. */
  metricLabels: string[];
}

/**
 * Everything the create-goal metric picker needs to offer, in one round of
 * parallel reads. Each list degrades to empty on its own rather than failing the
 * form — a missing table should cost you one metric kind, not the whole screen.
 */
export async function listMetricOptions(client: Client): Promise<MetricOptions> {
  const [exercises, subjects, exams, boards, cardio, metrics] = await Promise.all([
    client.from('exercises').select('id, name').order('name').then((r) => r.data ?? []),
    client.from('subjects').select('id, name').order('name').then((r) => r.data ?? []),
    client
      .from('exams')
      .select('id, title, exam_date, subject_id')
      .order('exam_date', { ascending: false })
      .then((r) => r.data ?? []),
    client.from('work_boards').select('id, name').order('position').then((r) => r.data ?? []),
    // Every row, or an activity logged only long ago drops out of the picker.
    fetchAll((from, to) => client.from('cardio_entries').select('activity').order('id').range(from, to)).catch(() => []),
    fetchAll((from, to) => client.from('work_metrics').select('label').order('id').range(from, to)).catch(() => []),
  ]);

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const distinct = (values: string[]) => {
    const seen = new Map<string, string>();
    for (const v of values) {
      const key = v.toLowerCase();
      if (!seen.has(key)) seen.set(key, v);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  };

  return {
    exercises,
    subjects,
    // An exam title is optional, so fall back to subject + date — "untitled" is
    // useless in a picker where every row has to be distinguishable.
    exams: exams.map((e) => ({
      id: e.id,
      name: e.title?.trim()
        ? `${e.title} · ${e.exam_date}`
        : `${subjectName.get(e.subject_id) ?? 'Exam'} · ${e.exam_date}`,
    })),
    boards,
    activities: distinct(cardio.map((c) => c.activity)),
    metricLabels: distinct(metrics.map((m) => m.label)),
  };
}
