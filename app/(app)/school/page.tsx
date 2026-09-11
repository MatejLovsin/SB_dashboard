import Link from 'next/link';
import { BookOpen, ChevronRight, ClipboardList, History, Archive, LineChart } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { CountUp } from '@/components/ui/CountUp';
import { UpcomingExams } from '@/features/school/UpcomingExams';
import { StudyTimer } from '@/features/school/StudyTimer';
import { SchoolCharts } from '@/features/school/SchoolCharts';
import { createClient } from '@/lib/supabase/server';
import { GoalStrip } from '@/features/goals/GoalStrip';
import { listResolvedGoals } from '@/lib/queries/goals';
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

  const [sessions, subjects, upcomingExams, goals] = await Promise.all([
    listRecentStudySessions(supabase),
    listSubjects(supabase),
    listUpcomingExamsWithProgress(supabase),
    listResolvedGoals(supabase, { section: 'school', status: 'active' }).catch(() => []),
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
    <div className="space-y-4">
      <PageHeader title="School" description="Exams, study sessions, and results." />

      <GoalStrip goals={goals} />

      {/* KPI strip — 4-col on desktop */}
      <div className="stagger-fade grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="This week"
          value={<CountUp value={thisWeek} decimals={1} />}
          unit="h"
          delta={weekDelta}
        />
        <StatTile
          label="Upcoming"
          value={<CountUp value={upcomingExams.length} />}
          unit="exams"
        />
        <StatTile
          label="Streak"
          value={<CountUp value={streak} />}
          unit="days"
        />
        <StatTile
          label="Total logged"
          value={<CountUp value={totalHours} decimals={1} />}
          unit="h"
        />
      </div>

      {/* Timer + Upcoming side by side on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StudyTimer />
        <UpcomingExams />
      </div>

      {/* Charts */}
      <SchoolCharts
        weeklyHours={weeklyHours}
        hoursBySubject={hoursBySubject}
        hoursPerExam={hoursPerExam}
        totalHours={totalHours}
        thisWeekHours={thisWeek}
      />

      {/* Compact nav tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/school/subjects" className="block">
          <Card className="panel-hover press-flash flex items-center gap-3 p-3">
            <span className="rounded-lg bg-card-2 p-2 text-muted">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Subjects</span>
              <span className="block text-xs text-muted">{subjects.length} subjects</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Card>
        </Link>
        <Link href="/school/exams" className="block">
          <Card className="panel-hover press-flash flex items-center gap-3 p-3">
            <span className="rounded-lg bg-card-2 p-2 text-muted">
              <ClipboardList className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Exams</span>
              <span className="block text-xs text-muted">{upcomingExams.length} upcoming</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Card>
        </Link>
        <Link href="/school/sessions" className="block">
          <Card className="panel-hover press-flash flex items-center gap-3 p-3">
            <span className="rounded-lg bg-card-2 p-2 text-muted">
              <History className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Session History</span>
              <span className="block text-xs text-muted">All saved sessions</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Card>
        </Link>
        <Link href="/school/discarded" className="block">
          <Card className="panel-hover press-flash flex items-center gap-3 p-3">
            <span className="rounded-lg bg-card-2 p-2 text-muted">
              <Archive className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Discarded</span>
              <span className="block text-xs text-muted">Recover lost sessions</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Card>
        </Link>
        <Link href="/school/insights" className="col-span-2 block">
          <Card className="panel-hover press-flash flex items-center gap-3 p-3">
            <span className="rounded-lg bg-card-2 p-2 text-muted">
              <LineChart className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Grade Insights</span>
              <span className="block text-xs text-muted">Grade vs. study time</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
