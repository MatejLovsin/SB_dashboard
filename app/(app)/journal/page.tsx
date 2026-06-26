import { PageHeader } from '@/components/ui/PageHeader';
import { JournalReview } from '@/features/journal/JournalReview';

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal"
        description="Your weekly summaries, month by month."
      />
      <JournalReview />
    </div>
  );
}
