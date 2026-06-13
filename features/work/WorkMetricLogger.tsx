'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { workKeys, upsertWorkMetric } from '@/lib/queries/work';
import { Button } from '@/components/ui/Button';

const today = () => new Date().toISOString().slice(0, 10);

export function WorkMetricLogger() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [score, setScore] = useState(7);

  const mutation = useMutation({
    mutationFn: (value: number) => upsertWorkMetric(supabase, today(), value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workKeys.metrics() }),
  });

  return (
    <div className="panel flex items-center gap-4 rounded-2xl p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
        <Zap className="h-5 w-5 text-accent" />
      </span>
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Focus Score</p>
        <p className="mt-0.5 text-sm text-foreground">Log today's focus (1–10)</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={10}
          step={1}
          value={score}
          onChange={(e) => setScore(Math.min(10, Math.max(1, Number(e.target.value))))}
          className="w-16 rounded-xl border border-border bg-card px-3 py-2 text-center text-sm font-semibold nums focus:border-accent focus:outline-none"
        />
        <Button
          size="sm"
          onClick={() => mutation.mutate(score)}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Saving…' : mutation.isSuccess ? 'Saved' : 'Log'}
        </Button>
      </div>
    </div>
  );
}
