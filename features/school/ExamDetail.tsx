import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { ExamWithSubject } from '@/lib/queries/school';
import { daysUntil } from '@/lib/utils/dates';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * Expanded view of a single exam — full metadata and progress.
 * Rendered inside a {@link FocusOverlay}; visually distinct from the compact ExamCard
 * (larger type, generous spacing, eyebrow date chip, full progress bar).
 * Once the exam has passed, also hosts the only place a grade can be entered.
 */

export function ExamDetail({
  exam,
  studySeconds,
  onSaveGrade,
  isSavingGrade,
}: {
  exam: ExamWithSubject;
  studySeconds: number;
  onSaveGrade?: (grade: number | null) => void;
  isSavingGrade?: boolean;
}) {
  const days = daysUntil(exam.exam_date);
  const isUpcoming = days >= 0;
  const [editingGrade, setEditingGrade] = useState(false);
  const [gradeInput, setGradeInput] = useState('');

  function startEditingGrade() {
    setGradeInput(exam.grade != null ? String(exam.grade) : '');
    setEditingGrade(true);
  }

  function submitGrade(e: React.FormEvent) {
    e.preventDefault();
    onSaveGrade?.(gradeInput ? Number(gradeInput) : null);
    setEditingGrade(false);
  }

  const progress = exam.target_study_hours
    ? Math.min(100, (studySeconds / (exam.target_study_hours * 3600)) * 100)
    : null;

  const dateLabel = new Date(exam.exam_date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="space-y-5">
      {/* Eyebrow date chip */}
      <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
        <CalendarDays className="h-3.5 w-3.5" />
        {dateLabel}
      </div>

      {/* Subject + colour dot */}
      {exam.subject && (
        <div className="flex items-center gap-2">
          {exam.subject.color && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: exam.subject.color }}
            />
          )}
          <span className="text-sm text-muted">{exam.subject.name}</span>
        </div>
      )}

      {/* Days left or grade */}
      <div className="text-sm">
        {isUpcoming ? (
          <span className={days <= 7 ? 'font-medium text-amber-500' : 'text-foreground/80'}>
            {days === 0 ? 'Exam is today!' : `${days} day${days === 1 ? '' : 's'} until exam`}
          </span>
        ) : editingGrade ? (
          <form onSubmit={submitGrade} className="flex items-end gap-2">
            <Input
              label="Grade (%)"
              id="exam-grade-input"
              type="number"
              min="0"
              autoFocus
              value={gradeInput}
              onChange={(e) => setGradeInput(e.target.value)}
              placeholder="e.g. 85"
              className="max-w-[8rem]"
            />
            <Button type="submit" size="sm" disabled={isSavingGrade}>
              {isSavingGrade ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingGrade(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            {exam.grade != null ? (
              <span className="font-medium text-foreground/80">Grade: {exam.grade}%</span>
            ) : (
              <span className="italic text-muted">No grade recorded</span>
            )}
            {onSaveGrade && (
              <Button variant="ghost" size="sm" onClick={startEditingGrade}>
                {exam.grade != null ? 'Edit grade' : 'Add grade'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Perceived difficulty — 5 dots */}
      {exam.perceived_difficulty != null && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted uppercase tracking-wide">Difficulty</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((d) => (
              <span
                key={d}
                className={`h-3 w-3 rounded-full ${
                  d <= exam.perceived_difficulty! ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Study progress bar */}
      {progress !== null && exam.target_study_hours != null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted uppercase tracking-wide">Study progress</span>
            <span className="text-foreground/80">
              {(studySeconds / 3600).toFixed(1)}h / {exam.target_study_hours}h
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-xs text-muted">{Math.round(progress)}% complete</p>
        </div>
      )}
    </article>
  );
}
