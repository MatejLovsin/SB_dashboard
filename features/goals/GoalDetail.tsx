'use client';

import { useEffect, useState } from 'react';
import { CardTitle } from '@/components/ui/Card';
import { AreaTrend } from '@/components/charts/AreaTrend';
import { fmtGoalValue, geometry, type Geometry, type Notch } from '@/components/ui/goalBarGeometry';
import type { ResolvedGoal } from '@/lib/queries/goals';
import { deadlineNote } from './GoalCard';
import { GoalSteps, type Step } from './GoalSteps';
import { GoalTimeline, type NodeState } from './GoalTimeline';

interface GoalDetailProps {
  resolved: ResolvedGoal;
  /** Manual, still-active goals only. */
  onToggleMilestone?: (milestoneId: string) => void;
}

/** "12 Aug", or "12 Aug 2025" once it's not this year. */
function fmtDay(iso: string): string {
  const d = new Date(iso);
  const thisYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(thisYear ? {} : { year: 'numeric' }),
  });
}

/**
 * The trend chart's y-range: first step to last step, so the chart spends its
 * height on the stretch the goal is actually about instead of a flat run up
 * from 0. Widened if the history strays outside it, so no point gets clipped.
 */
function trendDomain(resolved: ResolvedGoal): [number, number] | undefined {
  const values = [
    ...resolved.milestones.flatMap((m) => (m.value != null ? [m.value] : [])),
    ...resolved.progression.map((o) => o.value),
  ];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return lo < hi ? [lo, hi] : undefined;
}

const withUnit =(v: number, unit: string) => `${fmtGoalValue(v)}${unit ? ` ${unit}` : ''}`;

/** The one place a node's state is decided, so the rail and the list can't disagree. */
function nodeStates(geo: Geometry): (n: Notch) => NodeState {
  const nextId = geo.notches.find((n) => !n.hit)?.id ?? null;
  return (n) =>
    n.hit ? 'hit' : n.id === nextId ? 'next' : n.pct < geo.fillPct - 0.001 ? 'skipped' : 'future';
}

function buildSteps(resolved: ResolvedGoal, geo: Geometry, stateOf: (n: Notch) => NodeState): Step[] {
  const unit = resolved.goal.unit ?? '';
  const byId = new Map(resolved.milestones.map((m) => [m.id, m]));
  return geo.notches.map((n, i) => {
    const m = byId.get(n.id);
    const value = m?.value != null ? withUnit(m.value, unit) : null;
    return {
      id: n.id,
      index: i + 1,
      title: m?.label ?? value ?? `Step ${i + 1}`,
      detail: m?.label ? value : null,
      clearedOn: m?.hitAt ? fmtDay(m.hitAt) : null,
      state: stateOf(n),
    };
  });
}

export function GoalDetail({ resolved, onToggleMilestone }: GoalDetailProps) {
  const { goal, milestones, current, best } = resolved;
  const unit = goal.unit ?? '';
  const geo = geometry({
    milestones,
    start: goal.start_value,
    target: goal.target_value,
    current,
    best,
    direction: goal.direction,
  });
  const stateOf = nodeStates(geo);
  const steps = buildSteps(resolved, geo, stateOf);
  const numeric = geo.mode === 'numeric';

  // The flare clears itself; re-ticking another node restarts the timer.
  const [unlocked, setUnlocked] = useState<string | null>(null);
  useEffect(() => {
    if (!unlocked) return;
    const id = setTimeout(() => setUnlocked(null), 700);
    return () => clearTimeout(id);
  }, [unlocked]);

  const toggle = onToggleMilestone
    ? (id: string) => {
        onToggleMilestone(id);
        // un-ticking a mistake shouldn't celebrate
        if (!geo.notches.find((n) => n.id === id)?.hit) setUnlocked(id);
      }
    : undefined;

  const byId = new Map(milestones.map((m) => [m.id, m]));
  const captionOf = (n: Notch) => {
    const value = byId.get(n.id)?.value;
    return numeric && value != null ? fmtGoalValue(value) : String(geo.notches.indexOf(n) + 1).padStart(2, '0');
  };

  return (
    <div className="space-y-8">
      <div>
        <CardTitle className="mb-2">
          {goal.section} · {goal.source === 'manual' ? 'manual' : 'auto'}
        </CardTitle>
        {goal.description ? <p className="text-sm leading-relaxed text-muted">{goal.description}</p> : null}
      </div>

      <Readouts resolved={resolved} geo={geo} hitCount={steps.filter((s) => s.state === 'hit').length} />

      {geo.notches.length > 0 ? (
        <GoalTimeline
          geo={geo}
          stateOf={stateOf}
          captionOf={captionOf}
          startCap={numeric && goal.start_value != null ? withUnit(goal.start_value, unit) : 'Start'}
          targetCap={numeric && goal.target_value != null ? withUnit(goal.target_value, unit) : 'Done'}
          unlocked={unlocked}
          onToggle={toggle ? (n) => toggle(n.id) : undefined}
        />
      ) : null}

      <section>
        <CardTitle className="mb-1">Steps</CardTitle>
        {steps.length > 0 ? (
          <GoalSteps steps={steps} unlocked={unlocked} onToggle={toggle} />
        ) : (
          <p className="py-3 text-sm text-muted">No steps written out for this goal yet.</p>
        )}
      </section>

      {goal.source === 'auto' && resolved.progression.length >= 2 ? (
        <section>
          <CardTitle className="mb-3">Trend</CardTitle>
          <AreaTrend
            data={resolved.progression.map((o) => ({ label: fmtDay(o.at), value: o.value }))}
            unit={unit || undefined}
            name={goal.title}
            height={180}
            domain={trendDomain(resolved)}
          />
        </section>
      ) : null}
    </div>
  );
}

function Readouts({ resolved, geo, hitCount }: { resolved: ResolvedGoal; geo: Geometry; hitCount: number }) {
  const { goal, current, best } = resolved;
  const unit = goal.unit ?? '';
  const percent = Math.round(geo.fillPct * 100);
  const achieved = goal.status === 'achieved' || percent >= 100;
  const due = goal.deadline ? deadlineNote(goal.deadline, achieved) : null;

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <div className="mr-auto">
        <span className={`nums text-5xl font-bold ${achieved ? 'text-accent' : 'emissive'}`}>{percent}</span>
        <span className="label ml-1 text-xs text-muted">%</span>
      </div>
      {geo.mode === 'numeric' ? (
        <>
          {current != null ? <Readout label="Now" value={withUnit(current, unit)} /> : null}
          {best != null && best !== current ? <Readout label="Best" value={withUnit(best, unit)} /> : null}
        </>
      ) : (
        <Readout label="Steps" value={`${hitCount}/${geo.notches.length}`} />
      )}
      {achieved && goal.achieved_at ? <Readout label="Done" value={fmtDay(goal.achieved_at)} /> : null}
      {due ? <Readout label={due.late ? 'Overdue' : 'Deadline'} value={due.text} tone={due.late ? 'text-down' : ''} /> : null}
    </div>
  );
}

function Readout({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="label mb-1 text-[9px] text-muted">{label}</div>
      <div className={`nums text-sm ${tone}`}>{value}</div>
    </div>
  );
}
