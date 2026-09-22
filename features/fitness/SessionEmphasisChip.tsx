'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fitnessKeys } from '@/lib/queries/fitness';
import { setSessionEmphasis } from '@/lib/queries/emphasis';
import type { ProgrammeEmphasis } from '@/lib/db/types';
import { EmphasisChip, nextEmphasis } from './EmphasisChip';

interface Props {
  sessionId: string;
  exerciseId: string;
  emphasis: ProgrammeEmphasis | null;
}

/**
 * Re-label one exercise in one already-logged session. The plan stamps this at
 * log time, so this is the fix-up for an ad-hoc session, a day you swapped the
 * intensity on, or history from before the plan carried a label at all.
 *
 * Optimistic against local state rather than the cache, because the session is
 * fetched server-side and the chip is tapped two or three times in a row.
 */
export function SessionEmphasisChip({ sessionId, exerciseId, emphasis }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(emphasis);

  const mutation = useMutation({
    mutationFn: (next: ProgrammeEmphasis | null) =>
      setSessionEmphasis(supabase, sessionId, exerciseId, next),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fitnessKeys.exerciseHistory(exerciseId) });
      queryClient.invalidateQueries({ queryKey: fitnessKeys.exerciseLibrary() });
    },
    onError: () => setValue(emphasis),
  });

  return (
    <EmphasisChip
      value={value}
      disabled={mutation.isPending}
      onCycle={() => {
        const next = nextEmphasis(value);
        setValue(next);
        mutation.mutate(next);
      }}
    />
  );
}
