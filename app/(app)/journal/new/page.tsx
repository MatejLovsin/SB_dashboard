import { createClient } from '@/lib/supabase/server';
import { getJournalHomeState } from '@/lib/queries/journal';
import { PageHeader } from '@/components/ui/PageHeader';
import { JournalEntry } from '@/features/journal/JournalEntry';

export default async function JournalNewPage() {
  const supabase = await createClient();
  const state = await getJournalHomeState(supabase).catch(() => null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Summary"
        description="Reflect on what happened last week."
      />
      <JournalEntry
        entryOpen={state?.entryOpen ?? false}
        targetWeekStart={state?.targetWeekStart ?? ''}
        nextOpenMonday={state?.nextOpenMonday}
      />
    </div>
  );
}
