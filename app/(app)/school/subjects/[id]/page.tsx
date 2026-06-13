import { notFound } from 'next/navigation';
import { Clock, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatTile } from '@/components/ui/StatTile';
import dynamic from 'next/dynamic';
import { weeklyStudyHoursSeries } from '@/lib/queries/school';

const SubjectHoursChart = dynamic(() =>
  import('@/features/school/charts/SubjectHoursChart').then((m) => m.SubjectHoursChart),
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
  const weeklySeries = weeklyStudyHoursSeries(sessions);

  return (
    <div className="space-y-6">
      <PageHeader title={subject.name} description="Study sessions and hours logged." />

      <div className="stagger-fade grid grid-cols-2 gap-3">
        <StatTile label="Total hours" value={totalHours} unit="h" />
        <StatTile label="Sessions" value={sessions.length} />
      </div>

      <ChartCard title="Weekly hours">
        <SubjectHoursChart data={weeklySeries} />
      </ChartCard>

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
