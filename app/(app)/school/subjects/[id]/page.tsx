import { notFound } from 'next/navigation';
import { Clock, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import dynamic from 'next/dynamic';

const StudySessionsChart = dynamic(() =>
  import('@/features/school/charts/StudySessionsChart').then((m) => m.StudySessionsChart),
);

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// `params` is a Promise in Next 16 — await it before reading the segment.
export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .single();

  if (!subject) notFound();

  const { data: rows } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('subject_id', id)
    .order('started_at', { ascending: false });

  const sessions = rows ?? [];
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  return (
    <div>
      <PageHeader
        title={subject.name}
        description="Study sessions and hours logged."
      />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Clock className="h-3.5 w-3.5" /> Total hours
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {totalHours}
            <span className="ml-1 text-base font-normal text-muted">h</span>
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <BookOpen className="h-3.5 w-3.5" /> Sessions
          </div>
          <p className="text-3xl font-bold tabular-nums">{sessions.length}</p>
        </Card>
      </div>

      {sessions.length > 0 && (
        <Card className="mb-5">
          <CardTitle className="mb-4">Minutes per session</CardTitle>
          <StudySessionsChart sessions={sessions} />
        </Card>
      )}

      <Card>
        <CardTitle className="mb-4">Session history</CardTitle>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">No sessions logged yet. Start the timer on the School page.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.slice(0, 50).map((s) => (
              <li
                key={s.id}
                className="flex items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDate(s.started_at)}</p>
                  {s.note && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{s.note}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatDuration(s.duration_seconds)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
