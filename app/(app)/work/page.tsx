import Link from 'next/link';
import { FileText } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { CountUp } from '@/components/ui/CountUp';
import { Sparkline } from '@/components/charts/Sparkline';
import { Card } from '@/components/ui/Card';
import { KanbanBoard } from '@/features/work/KanbanBoard';
import { WorkCharts } from '@/features/work/WorkCharts';
import { WorkMetricLogger } from '@/features/work/WorkMetricLogger';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { SummaryCard } from '@/components/ai/SummaryCard';
import {
  listCards,
  listNotes,
  listWorkMetrics,
  cardsByStatus,
  cardsByPriority,
  notesPerWeek,
  focusScoreSeries,
} from '@/lib/queries/work';

export default async function WorkPage() {
  const supabase = await createClient();

  const [summary, cards, notes, metrics] = await Promise.all([
    getSummary(supabase, 'work').catch(() => null),
    listCards(supabase),
    listNotes(supabase),
    listWorkMetrics(supabase),
  ]);

  const byStatus = cardsByStatus(cards);
  const byPriority = cardsByPriority(cards);
  const weeklyNotes = notesPerWeek(notes);
  const focusSeries = focusScoreSeries(metrics);

  const totalCards = cards.length;
  const doneCards = cards.filter((c) => c.status === 'done').length;
  const totalNotes = notes.length;
  const latestFocus = metrics.length > 0 ? metrics[metrics.length - 1].value : null;

  const notesSparkline = weeklyNotes.map((p) => p.value);
  const focusSparkline = focusSeries.map((p) => p.value);

  return (
    <div className="space-y-4">
      <PageHeader title="Work" description="Roadmap, decisions, and analytics." />

      <SummaryCard section="work" initial={summary} />

      {/* KPI strip — 4 tiles */}
      <div className="stagger-fade grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total cards"
          value={<CountUp value={totalCards} />}
        />
        <StatTile
          label="Done"
          value={<CountUp value={doneCards} />}
          unit="cards"
        />
        <StatTile
          label="Focus score"
          value={latestFocus !== null ? <CountUp value={latestFocus} decimals={1} /> : '—'}
          unit={latestFocus !== null ? '/ 10' : ''}
        >
          <Sparkline data={focusSparkline} />
        </StatTile>
        <StatTile
          label="Notes"
          value={<CountUp value={totalNotes} />}
          unit="entries"
        >
          <Sparkline data={notesSparkline} />
        </StatTile>
      </div>

      {/* Focus score logger — compact */}
      <WorkMetricLogger />

      {/* Kanban */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Roadmap</h2>
        <KanbanBoard />
      </section>

      {/* Notes — compact stat tile with sparkline */}
      <Link
        href="/work/notes"
        className="panel panel-hover press-flash flex items-center gap-4 rounded-2xl p-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card-2">
          <FileText className="h-4 w-4 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Notes &amp; Decisions</p>
          <p className="text-xs text-muted">{totalNotes} entries · searchable log</p>
        </div>
        <div className="w-20 shrink-0">
          <Sparkline data={notesSparkline} height={28} />
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>

      {/* Analytics */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Analytics</h2>
        <WorkCharts
          cardsByStatus={byStatus}
          totalCards={totalCards}
          cardsByPriority={byPriority}
          notesPerWeek={weeklyNotes}
          focusScoreSeries={focusSeries}
        />
      </section>
    </div>
  );
}
