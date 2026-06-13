import Link from 'next/link';
import { BookOpen, ClipboardList, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { UpcomingExams } from '@/features/school/UpcomingExams';
import { StudyTimer } from '@/features/school/StudyTimer';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { SummaryCard } from '@/components/ai/SummaryCard';

export default async function SchoolPage() {
  const supabase = await createClient();
  const summary = await getSummary(supabase, 'school').catch(() => null);

  return (
    <div>
      <PageHeader title="School" description="Exams, study sessions, and results." />
      <div className="mb-5">
        <SummaryCard section="school" initial={summary} />
      </div>
      <StudyTimer />
      <div className="mt-5">
        <UpcomingExams />
      </div>
      <div className="mt-5 space-y-3">
        <Link href="/school/subjects" className="block">
          <Card className="flex items-center gap-3 p-4">
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
          <Card className="flex items-center gap-3 p-4">
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
