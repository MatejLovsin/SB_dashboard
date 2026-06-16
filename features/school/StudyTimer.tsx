'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  schoolKeys,
  listSubjects,
  listExams,
  createStudySession,
  createDiscardedSession,
  type StudySessionInput,
  type DiscardedSessionInput,
} from '@/lib/queries/school';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TextArea } from '@/components/ui/TextArea';
import { inputClasses } from '@/components/ui/Input';
import { Play, Pause, Square } from 'lucide-react';

type Phase = 'idle' | 'running' | 'paused' | 'saving';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function shortExamLabel(examDate: string, title: string | null): string {
  const date = new Date(examDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return title ? `${title} — ${date}` : date;
}

export function StudyTimer() {
  const supabase = createClient();
  const qc = useQueryClient();

  const { data: subjects = [] } = useQuery({
    queryKey: schoolKeys.subjects(),
    queryFn: () => listSubjects(supabase),
  });
  const { data: allExams = [] } = useQuery({
    queryKey: schoolKeys.exams(),
    queryFn: () => listExams(supabase),
  });

  const [phase, setPhase] = useState<Phase>('idle');
  const [subjectId, setSubjectId] = useState('');
  const [examId, setExamId] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');

  const startedAtRef = useRef('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastResumedRef = useRef(0);
  const accumulatedRef = useRef(0);

  const examsForSubject = allExams.filter((e) => e.subject_id === subjectId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startInterval() {
    lastResumedRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(
        accumulatedRef.current + Math.floor((Date.now() - lastResumedRef.current) / 1000),
      );
    }, 500);
  }

  function handleStart() {
    if (!subjectId) return;
    startedAtRef.current = new Date().toISOString();
    accumulatedRef.current = 0;
    setElapsed(0);
    setPhase('running');
    startInterval();
  }

  function handlePause() {
    stopInterval();
    const final = accumulatedRef.current + Math.floor((Date.now() - lastResumedRef.current) / 1000);
    accumulatedRef.current = final;
    setElapsed(final);
    setPhase('paused');
  }

  function handleResume() {
    setPhase('running');
    startInterval();
  }

  function handleStop() {
    stopInterval();
    const final =
      phase === 'running'
        ? accumulatedRef.current + Math.floor((Date.now() - lastResumedRef.current) / 1000)
        : elapsed;
    accumulatedRef.current = final;
    setElapsed(final);
    setPhase('saving');
  }

  const discardMut = useMutation({
    mutationFn: (input: DiscardedSessionInput) => createDiscardedSession(supabase, input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: schoolKeys.discarded() });
      accumulatedRef.current = 0;
      setElapsed(0);
      setNote('');
      setPhase('idle');
    },
  });

  function handleDiscard() {
    stopInterval();
    if (elapsed > 0 && subjectId) {
      discardMut.mutate({
        subject_id: subjectId,
        exam_id: examId || null,
        started_at: startedAtRef.current,
        duration_seconds: elapsed,
        note: note.trim() || null,
      });
    } else {
      accumulatedRef.current = 0;
      setElapsed(0);
      setNote('');
      setPhase('idle');
    }
  }

  const saveMut = useMutation({
    mutationFn: (input: StudySessionInput) => createStudySession(supabase, input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: schoolKeys.studySessions(vars.subject_id) });
      qc.invalidateQueries({ queryKey: schoolKeys.all });
      accumulatedRef.current = 0;
      setElapsed(0);
      setNote('');
      setPhase('idle');
    },
  });

  function handleSave() {
    saveMut.mutate({
      subject_id: subjectId,
      exam_id: examId || null,
      started_at: startedAtRef.current,
      ended_at: new Date().toISOString(),
      duration_seconds: elapsed,
      note: note.trim() || null,
    });
  }

  useEffect(() => () => stopInterval(), []);

  return (
    <Card>
      <CardTitle className="mb-4">Study timer</CardTitle>

      {phase === 'idle' && (
        <div className="space-y-3">
          <select
            className={inputClasses}
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setExamId('');
            }}
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {subjectId && examsForSubject.length > 0 && (
            <select
              className={inputClasses}
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            >
              <option value="">No specific exam</option>
              {examsForSubject.map((e) => (
                <option key={e.id} value={e.id}>
                  {shortExamLabel(e.exam_date, e.title)}
                </option>
              ))}
            </select>
          )}

          <Button className="w-full" onClick={handleStart} disabled={!subjectId}>
            <Play className="h-4 w-4" /> Start
          </Button>
        </div>
      )}

      {(phase === 'running' || phase === 'paused') && (
        <div className="space-y-4">
          <div className="text-center">
            <p
              className={`text-5xl font-bold tabular-nums tracking-wide transition-opacity ${
                phase === 'paused' ? 'opacity-50' : ''
              }`}
            >
              {formatTime(elapsed)}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {selectedSubject?.name}
              {phase === 'paused' && ' · paused'}
            </p>
          </div>

          <div className="flex gap-2">
            {phase === 'running' ? (
              <Button variant="secondary" className="flex-1" onClick={handlePause}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleResume}>
                <Play className="h-4 w-4" /> Resume
              </Button>
            )}
            <Button variant="danger" className="flex-1" onClick={handleStop}>
              <Square className="h-4 w-4" /> Stop
            </Button>
          </div>
        </div>
      )}

      {phase === 'saving' && (
        <div className="space-y-3">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums">{formatTime(elapsed)}</p>
            <p className="mt-1 text-sm text-muted">{selectedSubject?.name}</p>
          </div>

          <TextArea
            placeholder="Session notes (optional)"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saveMut.isPending}>
              {saveMut.isPending && <Spinner />} Save
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={handleDiscard}
              disabled={saveMut.isPending || discardMut.isPending}
            >
              {discardMut.isPending ? 'Saving…' : 'Discard'}
            </Button>
          </div>

          {saveMut.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {(saveMut.error as Error).message}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
