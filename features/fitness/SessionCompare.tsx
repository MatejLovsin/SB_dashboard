'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Columns3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  listSessionCategories,
  getRecentSessionsByCategory,
  type SessionCategory,
} from '@/lib/queries/analytics';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SessionDetailBody } from '@/features/fitness/FitnessSessionDetail';

export function SessionCompare() {
  const supabase = createClient();
  const [selected, setSelected] = useState<SessionCategory | null>(null);

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ['fitness', 'session-categories'],
    queryFn: () => listSessionCategories(supabase),
    staleTime: 30_000,
  });

  // Default-select the first category once loaded
  useEffect(() => {
    if (!selected && categories && categories.length > 0) {
      setSelected(categories[0]);
    }
  }, [selected, categories]);

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['fitness', 'compare', selected?.key],
    queryFn: () => getRecentSessionsByCategory(supabase, selected!.label, 3),
    enabled: !!selected,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compare sessions"
        description="Your last 3 sessions in a category, side by side."
      />

      {catsLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading…
        </div>
      ) : !categories || categories.length === 0 ? (
        <EmptyState
          icon={Columns3}
          title="No sessions yet"
          description="Give your plans a category (Push/Pull/Legs…) and log a few sessions to compare them here."
        />
      ) : (
        <>
          {/* Category pill selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelected(cat)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium press-flash transition-colors ${
                  selected?.key === cat.key
                    ? 'bg-accent text-white'
                    : 'border border-border bg-card text-muted hover:text-foreground'
                }`}
              >
                {cat.label}
                <span className="ml-1.5 opacity-70">{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Session columns */}
          {sessionsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Loading…
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-muted">No sessions in this category yet.</p>
          ) : (
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible">
              {sessions.map((s) => (
                <Card
                  key={s.session.id}
                  className="snap-center shrink-0 basis-[85%] sm:basis-[60%] lg:basis-auto lg:shrink"
                >
                  <p className="mb-3 truncate text-sm font-semibold tracking-tight">
                    {s.session.title ?? 'Workout'}
                  </p>
                  <SessionDetailBody data={s} />
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
