import Link from 'next/link';
import { FileText, TrendingUp, BarChart2, Handshake } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KanbanBoard } from '@/features/work/KanbanBoard';
import { PlaceholderPanel } from '@/features/work/PlaceholderPanel';
import { createClient } from '@/lib/supabase/server';
import { getSummary } from '@/lib/queries/ai';
import { SummaryCard } from '@/components/ai/SummaryCard';

export default async function WorkPage() {
  const supabase = await createClient();
  const summary = await getSummary(supabase, 'work').catch(() => null);

  return (
    <div className="space-y-8">
      <PageHeader title="Work" description="Roadmap, decisions, and analytics." />

      <div>
        <SummaryCard section="work" initial={summary} />
      </div>

      {/* Kanban board */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Roadmap</h2>
        <KanbanBoard />
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Decisions log</h2>
        <Link
          href="/work/notes"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/50 hover:bg-card"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-semibold text-sm">Notes &amp; Decisions</p>
            <p className="text-xs text-muted">Full-text searchable log of ideas and choices</p>
          </div>
        </Link>
      </section>

      {/* Placeholder analytics panels */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Analytics</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <PlaceholderPanel
            icon={TrendingUp}
            title="User Growth"
            description="No data yet. Connect a user growth source to visualize signups and churn."
            futureNote="Future table: user_growth"
          />
          <PlaceholderPanel
            icon={BarChart2}
            title="Post Performance"
            description="No data yet. Link your content platform to track reach and engagement."
            futureNote="Future table: post_performance"
          />
          <PlaceholderPanel
            icon={Handshake}
            title="Partnership Tracker"
            description="No data yet. Log partnerships and track their progress here."
            futureNote="Future table: partnerships"
          />
        </div>
      </section>
    </div>
  );
}
