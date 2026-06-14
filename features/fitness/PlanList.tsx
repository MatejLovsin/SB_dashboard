'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Dumbbell, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys } from '@/lib/queries/fitness';
import { createPlan, deletePlan, listPlans, type PlanInput } from '@/lib/queries/plans';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PlanForm } from './PlanForm';

export function PlanList() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: plans, isPending, isError, error } = useQuery({
    queryKey: fitnessKeys.plans(),
    queryFn: () => listPlans(supabase),
  });

  const createMutation = useMutation({
    mutationFn: (input: PlanInput) => createPlan(supabase, input),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.plans() });
      router.push(`/fitness/plans/${plan.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => deletePlan(supabase, planId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fitnessKeys.plans() }),
  });

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Reusable workout templates."
        action={
          !creating ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          ) : undefined
        }
      />

      {creating ? (
        <Card className="mb-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            New plan
          </h2>
          <PlanForm
            submitLabel="Create"
            pending={createMutation.isPending}
            onSubmit={(values) => createMutation.mutate(values)}
            onCancel={() => setCreating(false)}
          />
          {createMutation.isError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {(createMutation.error as Error).message}
            </p>
          ) : null}
        </Card>
      ) : null}

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Spinner /> Loading plans...
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
      ) : plans.length === 0 && !creating ? (
        <EmptyState
          icon={Dumbbell}
          title="No plans yet"
          description="Create a plan to save a reusable set of exercises and targets."
        />
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Card className="flex items-center gap-3 p-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card-2"
                >
                  <Dumbbell className="h-4 w-4 text-muted" />
                </span>
                <Link href={`/fitness/plans/${plan.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-medium">{plan.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {plan.category && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                        style={{ background: 'var(--card-2)', color: 'var(--muted)' }}
                      >
                        {plan.category}
                      </span>
                    )}
                    {plan.exerciseCount}{' '}
                    {plan.exerciseCount === 1 ? 'exercise' : 'exercises'}
                  </p>
                </Link>
                <Button
                  size="icon"
                  variant="danger"
                  aria-label={`Delete ${plan.name}`}
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Delete plan "${plan.name}"?`)) deleteMutation.mutate(plan.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Link
                  href={`/fitness/plans/${plan.id}`}
                  aria-label={`Open ${plan.name}`}
                  style={{ color: 'var(--muted)' }}
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
