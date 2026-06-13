import Link from 'next/link';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
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

  return (
    <div className="space-y-6">
      <PageHeader title="Work" description="Roadmap, decisions, and analytics." />

      <SummaryCard section="work" initial={summary} />

      {/* KPI strip */}
      <div className="stagger-fade grid grid-cols-3 gap-3">
        <StatTile label="Total Cards" value={totalCards} />
        <StatTile label="Done" value={doneCards} unit="cards" />
        <StatTile label="Focus" value={latestFocus ?? '—'} unit={latestFocus ? '/ 10' : ''} />
      </div>

      {/* Focus score logger */}
      <WorkMetricLogger />

      {/* Kanban */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Roadmap</h2>
        <KanbanBoard />
      </section>

      {/* Notes link */}
      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">Decisions log</h2>
        <Link
          href="/work/notes"
          className="panel panel-hover flex items-center gap-3 rounded-2xl p-4"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold">Notes &amp; Decisions</p>
            <p className="text-xs text-muted">{totalNotes} entries · searchable log</p>
          </div>
        </Link>
      </section>

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
