import { PageHeader } from '@/components/ui/PageHeader';
import { TodoReview } from '@/features/todos/TodoReview';

export default function TodosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="To-do performance"
        description="How you did the previous days and weeks."
      />
      <TodoReview />
    </div>
  );
}
