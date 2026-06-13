'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Dumbbell, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys, type SessionWithSets } from '@/lib/queries/fitness';
import { listPlans } from '@/lib/queries/plans';
import { startSession, startSessionFromPlan } from '@/lib/queries/sessions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActiveSession } from './ActiveSession';

// Drives the workout-logging flow: pick a plan (or start empty) → log sets live.
export function SessionRunner() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Seed the session into the cache so ActiveSession renders without refetching.
  const onStarted = (data: SessionWithSets) => {
    queryClient.setQueryData(fitnessKeys.session(data.session.id), data);
    setSessionId(data.session.id);
  };

  const fromPlanMutation = useMutation({
    mutationFn: (planId: string) => startSessionFromPlan(supabase, planId),
    onSuccess: onStarted,
  });

  const emptyMutation = useMutation({
    mutationFn: () => startSession(supabase, {}),
    onSuccess: onStarted,
  });

  const { data: plans, isPending, isError, error } = useQuery({
    queryKey: fitnessKeys.plans(),
    queryFn: () => listPlans(supabase),
    enabled: sessionId === null,
  });

  if (sessionId) {
    // Finishing/discarding returns to the fitness home.
    return <ActiveSession sessionId={sessionId} onFinish={() => router.push('/fitness')} />;
  }

  const starting = fromPlanMutation.isPending || emptyMutation.isPending;
  const startError = fromPlanMutation.error ?? emptyMutation.error;

  return (
    <div>
      <PageHeader title="Log workout" description="Start from a plan or log an empty session." />

      <Button
        variant="secondary"
        className="mb-5 w-full justify-start"
        disabled={starting}
        onClick={() => emptyMutation.mutate()}
      >
        <Plus className="h-4 w-4" />
        Empty workout
      </Button>

      <CardTitle className="mb-3">Start from a plan</CardTitle>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading plans…
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No plans yet"
          description="Create a plan first, or start an empty workout above."
        />
      ) : (
        <ul className="space-y-2.5">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card className="flex items-center gap-3 p-4">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left disabled:opacity-60"
                  disabled={starting}
                  onClick={() => fromPlanMutation.mutate(plan.id)}
                >
                  <p className="truncate font-medium">{plan.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {plan.category ? `${plan.category} · ` : ''}
                    {plan.exerciseCount} {plan.exerciseCount === 1 ? 'exercise' : 'exercises'}
                  </p>
                </button>
                {fromPlanMutation.isPending && fromPlanMutation.variables === plan.id ? (
                  <Spinner />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {startError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {(startError as Error).message}
        </p>
      ) : null}
    </div>
  );
}
