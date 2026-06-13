import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { NoteList } from '@/features/work/NoteList';

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes & Decisions"
        description="A searchable log of ideas, decisions, and context."
      />
      <NoteList />
    </div>
  );
}
