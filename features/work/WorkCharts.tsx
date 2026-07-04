'use client';

import { useState } from 'react';
import type { RoadmapCard, WorkBoard } from '@/lib/db/types';
import type { AreaTrendPoint } from '@/components/charts/AreaTrend';
import { cardsByStatus, cardsByPriority } from '@/lib/queries/work';
import { DonutStat } from '@/components/charts/DonutStat';
import { BarCluster } from '@/components/charts/BarCluster';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartReveal } from '@/components/charts/ChartReveal';

interface WorkChartsProps {
  cards: RoadmapCard[];
  boards: WorkBoard[];
  notesPerWeek: AreaTrendPoint[];
  focusScoreSeries: AreaTrendPoint[];
}

const ALL_BOARDS = 'all';

export function WorkCharts({ cards, boards, notesPerWeek, focusScoreSeries }: WorkChartsProps) {
  const [boardFilter, setBoardFilter] = useState<string>(ALL_BOARDS);

  const filteredCards =
    boardFilter === ALL_BOARDS ? cards : cards.filter((c) => c.board_id === boardFilter);
  const statusData = cardsByStatus(filteredCards);
  const priorityData = cardsByPriority(filteredCards);
  const totalCards = filteredCards.length;

  return (
    <div className="space-y-4">
      {boards.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setBoardFilter(ALL_BOARDS)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
              boardFilter === ALL_BOARDS
                ? 'bg-[var(--accent)] text-white'
                : 'border border-border bg-card text-muted hover:border-accent/30 hover:text-foreground'
            }`}
          >
            All boards
          </button>
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => setBoardFilter(board.id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
                boardFilter === board.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-border bg-card text-muted hover:border-accent/30 hover:text-foreground'
              }`}
            >
              {board.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartCard title="Cards by Status" value={totalCards}>
          {statusData.length > 0 ? (
            <DonutStat data={statusData} centerValue={totalCards} centerLabel="cards" />
          ) : (
            <p className="py-8 text-center text-sm text-muted">No cards yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Cards by Priority">
          <BarCluster data={priorityData} height={200} integer graded name="cards" />
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
