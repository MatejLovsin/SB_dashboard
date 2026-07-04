'use client';

import { useQuery } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cardioKeys, listCardioSessions } from '@/lib/queries/cardio';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardioSessionDetailBody } from './CardioSessionDetail';

function formatDate(iso: string): string {
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// No grouping by activity — cardio sessions rarely repeat the exact same
// activity mix twice in a row, so this just compares the most recent sessions.
export function CardioCompare() {
  const supabase = createClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: [...cardioKeys.sessions(), 'compare'],
    queryFn: () => listCardioSessions(supabase, 3),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Spinner /> Loading…
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        icon={HeartPulse}
        title="No cardio sessions yet"
        description="Log a few cardio sessions to compare them here."
      />
    );
  }

  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible">
      {sessions.map((s) => (
        <Card
          key={s.session.id}
          className="snap-center shrink-0 basis-[85%] sm:basis-[60%] lg:basis-auto lg:shrink"
        >
          <p className="mb-3 truncate text-sm font-semibold tracking-tight">
            {formatDate(s.session.performed_at)}
          </p>
          <CardioSessionDetailBody data={s} />
        </Card>
      ))}
    </div>
  );
}
