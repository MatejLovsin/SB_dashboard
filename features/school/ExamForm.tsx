'use client';
import { useState } from 'react';
import type { Subject } from '@/lib/db/types';
import type { ExamInput, ExamWithSubject } from '@/lib/queries/school';
import { descendantsOf } from '@/lib/utils/grades';
import { Input, inputClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Props {
  subjects: Subject[];
  /** Every exam, so this one can be marked as a re-sit of an earlier attempt. */
  exams?: ExamWithSubject[];
  /** Set when editing, so an exam can't be offered as a retake of itself. */
  examId?: string;
  initial?: Partial<ExamInput>;
  onSubmit: (input: ExamInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ExamForm({ subjects, exams = [], examId, initial, onSubmit, onCancel, isPending }: Props) {
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? subjects[0]?.id ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [examDate, setExamDate] = useState(initial?.exam_date ?? '');
  const [difficulty, setDifficulty] = useState<number | null>(initial?.perceived_difficulty ?? null);
  const [targetHours, setTargetHours] = useState(
    initial?.target_study_hours != null ? String(initial.target_study_hours) : '',
  );
  const [retakeOf, setRetakeOf] = useState(initial?.retake_of ?? '');

  // Only earlier sittings of the SAME subject can be re-sat, and never this exam
  // itself or anything downstream of it — that would close the chain into a loop.
  const downstream = examId ? descendantsOf(exams, examId) : null;
  const retakeCandidates = exams
    .filter(
      (e) =>
        e.subject_id === subjectId &&
        e.id !== examId &&
        !downstream?.has(e.id) &&
        (!examDate || e.exam_date <= examDate),
    )
    .reverse();
  const retakeValue = retakeCandidates.some((e) => e.id === retakeOf) ? retakeOf : '';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !examDate) return;
    onSubmit({
      subject_id: subjectId,
      title: title.trim() || null,
      exam_date: examDate,
      perceived_difficulty: difficulty,
      target_study_hours: targetHours ? Number(targetHours) : null,
      retake_of: retakeValue || null,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="exam-subject" className="mb-1.5 block text-sm font-medium">Subject</label>
        <select
          id="exam-subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className={inputClasses}
        >
          <option value="" disabled>Select…</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <Input
        label="Title (optional)"
        id="exam-title"
        value={title ?? ''}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Final exam"
      />
      <Input
        label="Date"
        id="exam-date"
        type="date"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        required
      />

      <div>
        <p className="mb-1.5 text-sm font-medium">Difficulty</p>
        <div className="flex gap-1.5">
          {[1,2,3,4,5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                difficulty != null && d <= difficulty
                  ? 'bg-accent text-white'
                  : 'border border-border text-muted'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {retakeCandidates.length > 0 && (
        <div>
          <label htmlFor="exam-retake" className="mb-1.5 block text-sm font-medium">
            Retake of
          </label>
          <select
            id="exam-retake"
            value={retakeValue}
            onChange={(e) => setRetakeOf(e.target.value)}
            className={inputClasses}
          >
            <option value="">Not a retake</option>
            {retakeCandidates.map((e) => (
              <option key={e.id} value={e.id}>
                {e.exam_date}
                {e.title ? ` · ${e.title}` : ''}
                {e.grade != null ? ` · ${e.grade}%` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Only the best passing attempt in a chain counts towards your average.
          </p>
        </div>
      )}

      <Input
        label="Target study hours"
        id="exam-hours"
        type="number"
        min="0"
        step="0.5"
        value={targetHours}
        onChange={(e) => setTargetHours(e.target.value)}
        placeholder="e.g. 20"
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={!subjectId || !examDate || isPending}>
          {isPending ? 'Saving…' : initial ? 'Save' : 'Add exam'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
