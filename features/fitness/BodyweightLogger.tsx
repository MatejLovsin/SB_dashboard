'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logBodyMetric } from '@/lib/queries/fitness';
import { ChartCard } from '@/components/charts/ChartCard';
import { AreaTrend } from '@/components/charts/AreaTrend';

export interface BodyPoint {
  label: string;
  value: number;
}

interface Props {
  initialPoints: BodyPoint[];
}

export function BodyweightLogger({ initialPoints }: Props) {
  const supabase = createClient();
  const [points, setPoints] = useState(initialPoints);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const latest = points.length > 0 ? points[points.length - 1].value : null;

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseFloat(weight);
    if (!kg || kg <= 0) return;
    setSaving(true);
    setErr(null);
    try {
      await logBodyMetric(supabase, kg);
      const label = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      setPoints((prev) => [...prev, { label, value: kg }]);
      setWeight('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ChartCard
      title="Bodyweight"
      value={latest !== null ? `${latest} kg` : undefined}
    >
      {points.length >= 2 ? (
        <AreaTrend
          data={points}
          height={160}
          unit="kg"
          name="weight"
        />
      ) : (
        <p className="py-4 text-sm text-muted">
          {points.length === 1 ? 'Log one more entry to see the trend.' : 'No entries yet.'}
        </p>
      )}

      <form onSubmit={handleLog} className="mt-3 flex gap-2">
        <input
          type="number"
          step="0.1"
          min="20"
          max="300"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm nums placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={saving || !weight}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? '…' : 'Log'}
        </button>
      </form>

      {err && (
        <p className="mt-2 text-xs" style={{ color: 'var(--down)' }}>
          {err}
        </p>
      )}
    </ChartCard>
  );
}
