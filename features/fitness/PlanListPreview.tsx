import Link from 'next/link';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { listPlans } from '@/lib/queries/plans';

export async function PlanListPreview() {
  const supabase = await createClient();
  const plans = await listPlans(supabase);
  const preview = plans.slice(0, 4);

  if (plans.length === 0) {
    return (
      <p className="text-sm text-muted">
        No plans yet — create one to save a reusable set of exercises.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {preview.map((plan) => (
        <Link
          key={plan.id}
          href={`/fitness/plans/${plan.id}`}
          className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-foreground/5 transition-colors"
        >
          <span className="rounded-lg bg-card-2 p-1.5 text-muted">
            <Dumbbell className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{plan.name}</span>
            {(plan.category || plan.exerciseCount > 0) && (
              <span className="text-xs text-muted">
                {plan.category ? `${plan.category} · ` : ''}
                {plan.exerciseCount} {plan.exerciseCount === 1 ? 'exercise' : 'exercises'}
              </span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </Link>
      ))}
      {plans.length > 4 && (
        <p className="pt-0.5 text-xs text-muted">
          +{plans.length - 4} more plan{plans.length - 4 === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
