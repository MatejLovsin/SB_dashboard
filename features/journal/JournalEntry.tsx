'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import {
  journalKeys,
  upsertJournalWeek,
  weekRangeLabel,
} from '@/lib/queries/journal';
import { createClient } from '@/lib/supabase/client';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';

interface JournalEntryProps {
  entryOpen: boolean;
  targetWeekStart: string;
  nextOpenMonday?: string;
}

export function JournalEntry({ entryOpen, targetWeekStart }: JournalEntryProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [content, setContent] = useState('');

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertJournalWeek(supabase, { week_start: targetWeekStart, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journalKeys.all });
      router.push('/journal');
    },
  });

  if (!entryOpen) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <BookOpen className="mb-3 h-8 w-8 text-muted" strokeWidth={1.6} />
        <p className="font-medium">You&apos;re all caught up.</p>
        <p className="mt-1 text-sm text-muted">
          Nothing to write until next week opens.
        </p>
        <Link
          href="/journal"
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          Review past summaries
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">
        Week of {weekRangeLabel(targetWeekStart)}
      </h2>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What happened this week…"
        maxRows={16}
        className="w-full"
      />
      <div className="flex items-center justify-between">
        <Link
          href="/journal"
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          View past summaries
        </Link>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!content.trim() || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
