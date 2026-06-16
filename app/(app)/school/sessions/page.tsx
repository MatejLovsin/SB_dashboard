import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SessionHistory } from '@/features/school/SessionHistory';

export default function SessionsPage() {
  return (
    <div>
      <Link
        href="/school"
        className="mb-4 flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> School
      </Link>
      <PageHeader
        title="Session History"
        description="All your saved study sessions."
      />
      <SessionHistory />
    </div>
  );
}
