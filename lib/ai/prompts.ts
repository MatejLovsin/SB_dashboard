import type { WorkoutSession, RoadmapCard, Note } from '@/lib/db/types';
import type { ExamWithProgress } from '@/lib/queries/school';

export type PromptParts = { system: string; userMsg: string };

export function buildFitnessPrompt(sessions: WorkoutSession[]): PromptParts {
  const system =
    'You are a personal fitness coach giving a brief training summary. ' +
    'Write 2-3 sentences covering recent workout frequency, any notable patterns or stalls, ' +
    'and one clear takeaway. Be specific to the data; skip generic advice. Plain prose only.';

  const lines: string[] = [];
  if (sessions.length === 0) {
    lines.push('No workouts logged in the last 14 days.');
  } else {
    lines.push(`Workouts in the last 14 days: ${sessions.length}`);
    for (const s of sessions.slice(0, 10)) {
      const date = s.performed_at.slice(0, 10);
      lines.push(`- ${date}: ${s.title ?? 'Untitled session'}`);
    }
  }

  return { system, userMsg: lines.join('\n') };
}

export function buildSchoolPrompt(exams: ExamWithProgress[]): PromptParts {
  const system =
    'You are a study coach giving a brief academic summary. ' +
    'Write 2-3 sentences covering upcoming exam pressure, study progress, and the single most ' +
    'important thing to focus on. Be specific to the data; skip generic advice. Plain prose only.';

  const lines: string[] = [];
  if (exams.length === 0) {
    lines.push('No upcoming exams.');
  } else {
    lines.push(`Upcoming exams (${exams.length}):`);
    for (const exam of exams.slice(0, 8)) {
      const daysLeft = Math.ceil(
        (new Date(exam.exam_date).getTime() - Date.now()) / 86_400_000,
      );
      const studyHrs = (exam.studySeconds / 3600).toFixed(1);
      const subject = exam.subject?.name ?? 'Unknown subject';
      const title = exam.title ? ` — ${exam.title}` : '';
      const target = exam.target_study_hours ? ` / ${exam.target_study_hours}h target` : '';
      lines.push(`- ${subject}${title}: ${daysLeft}d away, ${studyHrs}h studied${target}`);
    }
  }

  return { system, userMsg: lines.join('\n') };
}

export function buildWorkPrompt(cards: RoadmapCard[], notes: Note[]): PromptParts {
  const system =
    'You are a productivity coach giving a brief work summary. ' +
    'Write 2-3 sentences covering what is actively in progress, any key decisions made recently, ' +
    'and the clearest next priority. Be specific to the data; skip generic advice. Plain prose only.';

  const lines: string[] = [];
  const active = cards.filter((c) => c.status === 'in_progress');
  const planned = cards.filter((c) => c.status === 'planned');

  if (active.length > 0) {
    lines.push(`In progress (${active.length}):`);
    for (const c of active.slice(0, 5)) {
      lines.push(`- ${c.title}${c.priority ? ` [${c.priority}]` : ''}`);
    }
  } else {
    lines.push('Nothing currently in progress.');
  }

  if (planned.length > 0) {
    lines.push(`\nPlanned (${planned.length}):`);
    for (const c of planned.slice(0, 5)) {
      lines.push(`- ${c.title}${c.priority ? ` [${c.priority}]` : ''}`);
    }
  }

  const recentNotes = notes.slice(0, 5);
  if (recentNotes.length > 0) {
    lines.push(`\nRecent notes/decisions:`);
    for (const n of recentNotes) {
      lines.push(`- ${n.entry_date}: ${n.title}`);
    }
  }

  if (lines.length === 0) {
    lines.push('No roadmap items or notes yet.');
  }

  return { system, userMsg: lines.join('\n') };
}
