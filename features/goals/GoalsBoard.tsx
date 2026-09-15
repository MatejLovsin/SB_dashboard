'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { PageHeader } from '@/components/ui/PageHeader';
import { goalPercent } from '@/components/ui/GoalBar';
import { createClient } from '@/lib/supabase/client';
import {
  GOAL_SECTIONS,
  setMilestoneCompleted,
  type MetricOptions,
  type ResolvedGoal,
} from '@/lib/queries/goals';
import { GoalCard } from './GoalCard';
import { GoalDetail } from './GoalDetail';
import { GoalForm } from './GoalForm';

interface GoalsBoardProps {
  active: ResolvedGoal[];
  achieved: ResolvedGoal[];
  options: MetricOptions;
}

type Editing = { mode: 'new' } | { mode: 'edit'; goal: ResolvedGoal } | null;

export function GoalsBoard({ active, achieved, options }: GoalsBoardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
  // The id outlives `open`, so the panel keeps its content while it fades out.
  const [viewing, setViewing] = useState<{ id: string; open: boolean } | null>(null);
  // Optimistic ticks, keyed by milestone id, cleared when the refresh lands.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});

  const withTicks = (r: ResolvedGoal): ResolvedGoal => ({
    ...r,
    milestones: r.milestones.map((m) => (m.id in ticks ? { ...m, completed: ticks[m.id] } : m)),
  });

  const percentOf = (r: ResolvedGoal) =>
    goalPercent({
      milestones: r.milestones,
      start: r.goal.start_value,
      target: r.goal.target_value,
      current: r.current,
      best: r.best,
      direction: r.goal.direction,
    });

  async function toggle(resolved: ResolvedGoal, milestoneId: string) {
    const milestone = resolved.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;
    const next = !(milestoneId in ticks ? ticks[milestoneId] : milestone.completed);

    setTicks((prev) => ({ ...prev, [milestoneId]: next }));
    try {
      await setMilestoneCompleted(createClient(), milestoneId, next);
      router.refresh();
    } catch {
      // Put it back rather than leaving the bar showing progress that never saved.
      setTicks((prev) => {
        const rest = { ...prev };
        delete rest[milestoneId];
        return rest;
      });
    }
  }

  function closeAndRefresh() {
    setEditing(null);
    setTicks({});
    router.refresh();
  }

  const live = active.map(withTicks);
  // Exactly one number on the screen emits light: the goal closest to done that
  // isn't finished yet — the one worth looking at.
  const leadId = live
    .filter((r) => percentOf(r) < 100)
    .sort((a, b) => percentOf(b) - percentOf(a))[0]?.goal.id;

  const view = (r: ResolvedGoal) => setViewing({ id: r.goal.id, open: true });
  const liveViewed = viewing ? live.find((r) => r.goal.id === viewing.id) : undefined;
  const doneViewed = viewing ? achieved.find((r) => r.goal.id === viewing.id) : undefined;
  const viewed = liveViewed ?? doneViewed;

  const sections = GOAL_SECTIONS.map((section) => ({
    section,
    goals: live.filter((r) => r.goal.section === section),
  })).filter((s) => s.goals.length > 0);

  return (
    <>
      <PageHeader
        title="Goals"
        description="What you're chasing, and how far along it is."
        action={
          <Button size="sm" onClick={() => setEditing({ mode: 'new' })}>
            <Plus className="h-4 w-4" />
            New goal
          </Button>
        }
      />

      {live.length === 0 && achieved.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Write down something you're chasing, break it into milestones, and watch the bar fill."
        />
      ) : null}

      {sections.map(({ section, goals }) => (
        // Every goal wears the page's amber; the tick rule on each card is what
        // separates them, so the grid gets extra room to let that break read.
        <section key={section}>
          <CardTitle className="mb-2 capitalize">{section}</CardTitle>
          <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
            {goals.map((resolved) => (
              <GoalCard
                key={resolved.goal.id}
                resolved={resolved}
                lead={resolved.goal.id === leadId}
                onToggleMilestone={(id) => toggle(resolved, id)}
                onEdit={() => setEditing({ mode: 'edit', goal: resolved })}
                onOpen={() => view(resolved)}
              />
            ))}
          </div>
        </section>
      ))}

      {achieved.length > 0 ? (
        <section>
          <CardTitle className="mb-2 flex items-center gap-1.5">
            <Trophy className="h-3 w-3" />
            Done
          </CardTitle>
          <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
            {achieved.map((resolved) => (
              <GoalCard
                key={resolved.goal.id}
                resolved={resolved}
                onEdit={() => setEditing({ mode: 'edit', goal: resolved })}
                onOpen={() => view(resolved)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <FocusOverlay
        open={viewing?.open === true && viewed !== undefined}
        onClose={() => setViewing((v) => (v ? { ...v, open: false } : null))}
        size="reading"
        title={viewed?.goal.title}
        action={
          viewed ? (
            <button
              type="button"
              onClick={() => {
                setViewing(null);
                setEditing({ mode: 'edit', goal: viewed });
              }}
              aria-label={`Edit ${viewed.goal.title}`}
              className="rounded-full p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null
        }
      >
        {viewed ? (
          <GoalDetail
            // Same rule as the card: only a manual goal that's still active takes ticks.
            resolved={viewed}
            onToggleMilestone={
              liveViewed && liveViewed.goal.source === 'manual'
                ? (id) => toggle(liveViewed, id)
                : undefined
            }
          />
        ) : null}
      </FocusOverlay>

      <FocusOverlay
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="reading"
        title={editing?.mode === 'edit' ? editing.goal.goal.title : 'New goal'}
      >
        {editing ? (
          <GoalForm
            options={options}
            goal={editing.mode === 'edit' ? editing.goal.goal : undefined}
            milestones={
              editing.mode === 'edit'
                ? editing.goal.milestones.map((m) => ({ id: m.id, label: m.label, value: m.value }))
                : undefined
            }
            onSaved={closeAndRefresh}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </FocusOverlay>
    </>
  );
}
