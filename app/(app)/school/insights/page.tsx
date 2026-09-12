import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GradeInsights } from '@/features/school/GradeInsights';
import { createClient } from '@/lib/supabase/server';
import { listGradedExamsWithStudyHours, listSubjects } from '@/lib/queries/school';

export default async function SchoolInsightsPage() {
  const supabase = await createClient();
  const [points, subjects] = await Promise.all([
    listGradedExamsWithStudyHours(supabase),
    listSubjects(supabase),
  ]);

  return (
    <div>
      <Link
        href="/school"
        className="mb-4 flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> School
      </Link>
      <PageHeader
        title="Grade Insights"
        description="How study time and difficulty relate to your results. Counts one grade per exam — your best passing attempt — with fails and superseded sittings left out."
      />
      <GradeInsights points={points} subjects={subjects.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
