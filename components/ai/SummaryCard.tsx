'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { AiSection, AiSummary } from '@/lib/db/types';

interface Props {
  section: AiSection;
  initial: AiSummary | null;
}

type SummaryState = { content: string; generated_at: string } | null;

export function SummaryCard({ section, initial }: Props) {
  const [summary, setSummary] = useState<SummaryState>(
    initial ? { content: initial.content, generated_at: initial.generated_at } : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Failed to generate summary');
      }
      const data = (await res.json()) as { content: string; generated_at: string };
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-muted" />
          <span className="text-sm font-semibold">AI Summary</span>
        </div>
        <Button variant="ghost" size="sm" onClick={regenerate} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating…' : 'Regenerate'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {summary ? (
        <>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary.content}</p>
          <p className="text-xs text-muted">
            Generated {new Date(summary.generated_at).toLocaleString()}
          </p>
        </>
      ) : (
        <p className="text-sm italic text-muted">
          No summary yet — hit Regenerate to get an AI briefing.
        </p>
      )}
    </Card>
  );
}
