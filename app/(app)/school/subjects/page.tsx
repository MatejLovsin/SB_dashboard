import { PageHeader } from '@/components/ui/PageHeader';
import { SubjectList } from '@/features/school/SubjectList';

export default function SubjectsPage() {
  return (
    <div>
      <PageHeader title="Subjects" description="Manage your school subjects." />
      <SubjectList />
    </div>
  );
}
