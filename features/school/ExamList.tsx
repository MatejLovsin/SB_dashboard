'use client';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  schoolKeys, listSubjects, listExams, createExam, updateExam, deleteExam,
  getStudySecondsForExams, type ExamInput, type ExamWithSubject,
} from '@/lib/queries/school';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { ExamForm } from './ExamForm';
import { ExamCard } from './ExamCard';
import { ExamDetail } from './ExamDetail';
import { Pencil, Plus } from 'lucide-react';

type Tab = 'upcoming' | 'past';

export function ExamList() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusExam, setFocusExam] = useState<ExamWithSubject | null>(null);
  // Retain the last focused exam so its content stays put during the exit animation.
  const lastFocusExam = useRef<ExamWithSubject | null>(null);
  if (focusExam) lastFocusExam.current = focusExam;
  const displayExam = focusExam ?? lastFocusExam.current;

  const { data: subjects = [] } = useQuery({
    queryKey: schoolKeys.subjects(),
    queryFn: () => listSubjects(supabase),
  });
  const { data: exams = [], isPending } = useQuery({
    queryKey: schoolKeys.exams(),
    queryFn: () => listExams(supabase),
  });
  const examIds = exams.map((e) => e.id);
  const { data: studyMap } = useQuery({
    queryKey: schoolKeys.examStudyHours(examIds),
    queryFn: () => getStudySecondsForExams(supabase, examIds),
    enabled: examIds.length > 0,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: schoolKeys.exams() });

  const addMut = useMutation({
    mutationFn: (input: ExamInput) => createExam(supabase, input),
    onSuccess: () => { refresh(); setAdding(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExamInput> }) =>
      updateExam(supabase, id, patch),
    onSuccess: () => { refresh(); setEditingId(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteExam(supabase, id),
    onSuccess: refresh,
  });

  const today = new Date().toISOString().slice(0, 10);
  const filtered = exams.filter((e) =>
    tab === 'upcoming' ? e.exam_date >= today : e.exam_date < today
  );
  const editingExam = editingId ? exams.find((e) => e.id === editingId) : undefined;

  if (isPending) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted"><Spinner /> Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {(['upcoming', 'past'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-accent text-white' : 'text-muted hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {adding && (
        <Card>
          <ExamForm
            subjects={subjects}
            onSubmit={(i) => addMut.mutate(i)}
            onCancel={() => setAdding(false)}
            isPending={addMut.isPending}
          />
        </Card>
      )}

      {editingId && editingExam && (
        <Card>
          <ExamForm
            subjects={subjects}
            initial={editingExam}
            onSubmit={(patch) => editMut.mutate({ id: editingId, patch })}
            onCancel={() => setEditingId(null)}
            isPending={editMut.isPending}
          />
        </Card>
      )}

      {filtered.map((exam) => (
        <ExamCard
          key={exam.id}
          exam={exam}
          studySeconds={studyMap?.get(exam.id) ?? 0}
          onOpen={() => setFocusExam(exam)}
          onEdit={() => { setEditingId(exam.id); setAdding(false); }}
          onDelete={() => delMut.mutate(exam.id)}
          isDeleting={delMut.isPending && delMut.variables === exam.id}
        />
      ))}

      {filtered.length === 0 && !adding && !editingId && (
        <p className="py-8 text-center text-sm text-muted">
          {tab === 'upcoming' ? 'No upcoming exams.' : 'No past exams.'}
        </p>
      )}

      {!adding && !editingId && (
        <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add exam
        </Button>
      )}

      <FocusOverlay
        open={!!focusExam}
        onClose={() => setFocusExam(null)}
        title={displayExam ? (displayExam.title ?? displayExam.subject?.name ?? 'Exam') : undefined}
        label={displayExam ? `Exam: ${displayExam.title ?? displayExam.subject?.name ?? 'Exam'}` : 'Exam'}
        action={
          displayExam ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit exam"
              onClick={() => {
                const e = displayExam;
                setFocusExam(null);
                setEditingId(e.id);
                setAdding(false);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null
        }
      >
        {displayExam && (
          <ExamDetail
            exam={displayExam}
            studySeconds={studyMap?.get(displayExam.id) ?? 0}
          />
        )}
      </FocusOverlay>
    </div>
  );
}
