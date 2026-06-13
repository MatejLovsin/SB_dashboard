import { PageHeader } from '@/components/ui/PageHeader';
import { ExamList } from '@/features/school/ExamList';

export default function ExamsPage() {
  return (
    <div>
      <PageHeader title="Exams" description="Upcoming and past exams." />
      <ExamList />
    </div>
  );
}
