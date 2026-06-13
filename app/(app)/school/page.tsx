import Link from 'next/link';
import { BookOpen, ClipboardList, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { UpcomingExams } from '@/features/school/UpcomingExams';
import { StudyTimer } from '@/features/school/StudyTimer';
import { SchoolCharts } from '@/features/school/SchoolCharts';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { SummaryCard } from '@/components/ai/SummaryCard';
import {
  listSubjects,
  listUpcomingExamsWithProgress,
  listRecentStudySessions,
  weeklyStudyHoursSeries,
  studyHoursPerSubject,
  studyHoursThisWeek,
  studyHoursPrevWeek,
  studyStreakDays,
} from '@/lib/queries/school';
import { deltaPercent } from '@/lib/utils/stats';

export default async function SchoolPage() {
  const supabase = await createClient();

  const [summary, sessions, subjects, upcomingExams] = await Promise.all([
    getSummary(supabase, 'school').catch(() => null),
    listRecentStudySessions(supabase),
    listSubjects(supabase),
    listUpcomingExamsWithProgress(supabase),
  ]);

  const weeklyHours = weeklyStudyHoursSeries(sessions);
  const hoursBySubject = studyHoursPerSubject(sessions, subjects);
  const thisWeek = studyHoursThisWeek(sessions);
  const prevWeek = studyHoursPrevWeek(sessions);
  const streak = studyStreakDays(sessions);
  const weekDelta = deltaPercent(thisWeek, prevWeek);
  const totalHours = Math.round(hoursBySubject.reduce((s, d) => s + d.value, 0) * 10) / 10;

  const hoursPerExam = upcomingExams.map((e) => ({
    label: e.title ?? e.subject?.name ?? 'Exam',
    value: Math.round((e.studySeconds / 3600) * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="School" description="Exams, study sessions, and results." />

      <SummaryCard section="school" initial={summary} />

      <div className="stagger-fade grid grid-cols-3 gap-3">
        <StatTile label="This week" value={thisWeek} unit="h" delta={weekDelta} />
        <StatTile label="Upcoming" value={upcomingExams.length} unit="exams" />
        <StatTile label="Streak" value={streak} unit="days" />
      </div>

      <StudyTimer />

      <UpcomingExams />

      <SchoolCharts
        weeklyHours={weeklyHours}
        hoursBySubject={hoursBySubject}
        hoursPerExam={hoursPerExam}
        totalHours={totalHours}
        thisWeekHours={thisWeek}
      />

      <div className="space-y-3">
        <Link href="/school/subjects" className="block">
          <Card className="panel-hover flex items-center gap-3 p-4">
            <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Subjects</span>
              <span className="mt-0.5 block text-sm text-muted">Manage your school subjects.</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Card>
        </Link>
        <Link href="/school/exams" className="block">
          <Card className="panel-hover flex items-center gap-3 p-4">
            <span className="rounded-xl bg-accent/10 p-2.5 text-accent">
              <ClipboardList className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Exams</span>
              <span className="mt-0.5 block text-sm text-muted">Track upcoming exams and record grades.</span>
            </span>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
