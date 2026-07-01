import { createClient } from '@/lib/supabase/server';
import { listUpcomingExamsWithProgress } from '@/lib/queries/school';
import { Card, CardTitle } from '@/components/ui/Card';
import { daysUntil } from '@/lib/utils/dates';

export async function UpcomingExams() {
  const supabase = await createClient();
  const exams = await listUpcomingExamsWithProgress(supabase);

  return (
    <Card>
      <CardTitle className="mb-4">Upcoming exams</CardTitle>
      {exams.length === 0 ? (
        <p className="text-sm text-muted">No upcoming exams scheduled.</p>
      ) : (
        <ul className="space-y-3">
          {exams.slice(0, 5).map((exam) => {
            const days = daysUntil(exam.exam_date);
            const progress = exam.target_study_hours
              ? Math.min(100, (exam.studySeconds / (exam.target_study_hours * 3600)) * 100)
              : null;
            return (
              <li key={exam.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {exam.subject?.color && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: exam.subject.color }}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {exam.title ?? exam.subject?.name ?? 'Exam'}
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${
                    days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-muted'
                  }`}>
                    {days === 0 ? 'Today!' : `${days}d`}
                  </span>
                </div>
                {progress !== null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
