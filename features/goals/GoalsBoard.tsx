'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Target, Trophy } from 'lucide-react';
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
import type { GoalSection } from '@/lib/db/types';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';

interface GoalsBoardProps {
  active: ResolvedGoal[];
  achieved: ResolvedGoal[];
  options: MetricOptions;
}

// `life` has no section theme of its own — it isn't a part of the app, just a
// place for goals that belong to none of the three. It borrows the home accent.
const themeFor = (section: GoalSection) => (section === 'life' ? 'home' : section);

type Editing = { mode: 'new' } | { mode: 'edit'; goal: ResolvedGoal } | null;

export function GoalsBoard({ active, achieved, options }: GoalsBoardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing>(null);
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
        <section key={section} data-theme={themeFor(section)}>
          <CardTitle className="mb-2 capitalize">{section}</CardTitle>
          <div className="grid gap-4 lg:grid-cols-2">
            {goals.map((resolved) => (
              <GoalCard
                key={resolved.goal.id}
                resolved={resolved}
                lead={resolved.goal.id === leadId}
                onToggleMilestone={(id) => toggle(resolved, id)}
                onEdit={() => setEditing({ mode: 'edit', goal: resolved })}
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
          <div className="grid gap-4 lg:grid-cols-2">
            {achieved.map((resolved) => (
              <div key={resolved.goal.id} data-theme={themeFor(resolved.goal.section)}>
                <GoalCard
                  resolved={resolved}
                  onEdit={() => setEditing({ mode: 'edit', goal: resolved })}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
