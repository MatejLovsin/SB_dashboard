'use client';

import Link from 'next/link';
import { ArrowUpRight, Trophy } from 'lucide-react';
import { inputClasses } from '@/components/ui/Input';
import { GOAL_SECTIONS } from '@/lib/queries/goals';
import { useBoardContext, useGoalState, type GoalState } from './boardContext';

// A node or phase can link to one whole goal. While the goal is open it shows
// as a thin amber trace; once achieved, the light itself burns amber.

/** The `data-goal` attribute board.css keys its amber off. */
export const goalAttr = (goal: GoalState | undefined) =>
  goal ? (goal.achieved ? 'achieved' : 'linked') : undefined;

export function GoalTrace({ percent }: { percent: number }) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <span className="goal-trace" aria-hidden>
      <span style={{ width: `${width}%` }} />
    </span>
  );
}

const SECTION_LABEL = { fitness: 'Fitness', school: 'School', work: 'Work', life: 'Life' };

/** "Linked goal" select, grouped by section. `''` means no link. */
export function GoalLinkField({
  value,
  onChange,
}: {
  value: string;
  onChange: (goalId: string) => void;
}) {
  const { goals } = useBoardContext();
  const linked = useGoalState(value || null);
  // A linked goal that is no longer active is not in the options; keep it
  // selectable so opening the form does not silently unlink it.
  const missing = value && !goals.options.some((o) => o.id === value);

  return (
    <label className="block">
      <span className="label mb-1.5 block text-[10px] text-muted">Linked goal</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses}>
        <option value="">None</option>
        {missing ? <option value={value}>{linked?.title ?? 'Goal no longer active'}</option> : null}
        {GOAL_SECTIONS.map((section) => {
          const list = goals.options.filter((o) => o.section === section);
          if (!list.length) return null;
          return (
            <optgroup key={section} label={SECTION_LABEL[section]}>
              {list.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}

/** The linked goal's title and progress, with a way into that exact goal. */
export function GoalLinkStatus({ goalId }: { goalId: string | null }) {
  const goal = useGoalState(goalId);
  if (!goalId || !goal) return null;

  return (
    <Link
      href={`/goals?goal=${goalId}`}
      className="goal-link group flex items-center gap-3 rounded-xl py-1 text-sm"
      data-goal={goalAttr(goal)}
    >
      {goal.achieved ? <Trophy className="h-4 w-4 flex-none" /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{goal.title}</span>
        {goal.achieved ? (
          <span className="label text-[10px]">Achieved</span>
        ) : (
          <span className="mt-1.5 flex items-center gap-2">
            <GoalTrace percent={goal.percent} />
            <span className="label text-[10px]">{Math.round(goal.percent)}%</span>
          </span>
        )}
      </span>
      <ArrowUpRight className="h-4 w-4 flex-none opacity-60 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
