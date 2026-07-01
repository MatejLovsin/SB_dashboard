'use client';
import { useState } from 'react';
import type { Subject } from '@/lib/db/types';
import type { ExamInput } from '@/lib/queries/school';
import { Input, inputClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Props {
  subjects: Subject[];
  initial?: Partial<ExamInput>;
  onSubmit: (input: ExamInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ExamForm({ subjects, initial, onSubmit, onCancel, isPending }: Props) {
  const [subjectId, setSubjectId] = useState(initial?.subject_id ?? subjects[0]?.id ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [examDate, setExamDate] = useState(initial?.exam_date ?? '');
  const [difficulty, setDifficulty] = useState<number | null>(initial?.perceived_difficulty ?? null);
  const [targetHours, setTargetHours] = useState(
    initial?.target_study_hours != null ? String(initial.target_study_hours) : '',
  );
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !examDate) return;
    onSubmit({
      subject_id: subjectId,
      title: title.trim() || null,
      exam_date: examDate,
      perceived_difficulty: difficulty,
      target_study_hours: targetHours ? Number(targetHours) : null,
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
