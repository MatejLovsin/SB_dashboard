import { PageHeader } from '@/components/ui/PageHeader';
import { TodoPlanner } from '@/features/todos/TodoPlanner';

export default function TodosPlanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan tomorrow"
        description="Set tomorrow's to-dos, ordered by importance."
      />
      <TodoPlanner />
    </div>
  );
}
