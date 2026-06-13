import { FitnessOverview } from '@/features/fitness/FitnessOverview';
import { PageHeader } from '@/components/ui/PageHeader';

export default function FitnessOverviewPage() {
  return (
    <div>
      <PageHeader title="Overview" description="Sessions, streak, and stalled exercises." />
      <FitnessOverview />
    </div>
  );
}
