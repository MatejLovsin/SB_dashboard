'use client';

import type { DonutSlice } from '@/components/charts/DonutStat';
import type { BarPoint } from '@/components/charts/BarCluster';
import type { AreaTrendPoint } from '@/components/charts/AreaTrend';
import { DonutStat } from '@/components/charts/DonutStat';
import { BarCluster } from '@/components/charts/BarCluster';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartReveal } from '@/components/charts/ChartReveal';

interface WorkChartsProps {
  cardsByStatus: DonutSlice[];
  totalCards: number;
  cardsByPriority: BarPoint[];
  notesPerWeek: AreaTrendPoint[];
  focusScoreSeries: AreaTrendPoint[];
}

export function WorkCharts({
  cardsByStatus,
  totalCards,
  cardsByPriority,
  notesPerWeek,
  focusScoreSeries,
}: WorkChartsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title="Cards by Status" value={totalCards}>
          {cardsByStatus.length > 0 ? (
            <DonutStat data={cardsByStatus} centerValue={totalCards} centerLabel="cards" />
          ) : (
            <p className="py-8 text-center text-sm text-muted">No cards yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Cards by Priority">
          <BarCluster data={cardsByPriority} height={200} integer graded name="cards" />
        </ChartCard>
      </div>

      <ChartCard title="Notes per Week">
        <ChartReveal height={200}>
          <AreaTrend data={notesPerWeek} height={200} name="notes" />
        </ChartReveal>
      </ChartCard>

      <ChartCard title="Avg Focus Score" value={focusScoreSeries.at(-1)?.value ?? 0} action={<span className="text-xs text-muted">/ 10</span>}>
        <ChartReveal height={200}>
          <AreaTrend data={focusScoreSeries} height={200} name="focus score" />
        </ChartReveal>
      </ChartCard>
    </div>
  );
}
