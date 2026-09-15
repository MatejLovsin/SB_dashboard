'use client';

import { Pencil } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/Card';
import { GoalBar, fmtGoalValue, goalPercent } from '@/components/ui/GoalBar';
import type { ResolvedGoal } from '@/lib/queries/goals';

interface GoalCardProps {
  resolved: ResolvedGoal;
  /** The one goal on the screen allowed to emit light — nearest to done. */
  lead?: boolean;
  /** Manual goals only; omit to render the bar read-only. */
  onToggleMilestone?: (milestoneId: string) => void;
  onEdit?: () => void;
  /** Opens the close-up view. The whole card becomes the tap target. */
  onOpen?: () => void;
}

/** "in 12 days" / "3 days late" — a deadline only speaks up once it's set. */
export function deadlineNote(deadline: string, achieved: boolean): { text: string; late: boolean } | null {
  if (achieved) return null;
  const days = Math.round((Date.parse(deadline) - Date.now()) / 86_400_000);
  if (days < 0) return { text: `${Math.abs(days)}d late`, late: true };
  if (days === 0) return { text: 'due today', late: true };
  return { text: `${days}d left`, late: false };
}

export function GoalCard({ resolved, lead = false, onToggleMilestone, onEdit, onOpen }: GoalCardProps) {
  const { goal, milestones, current, best } = resolved;
  const manual = goal.source === 'manual';
  // Derived here rather than read off `resolved`, so an optimistic tick moves the
  // headline in the same frame as the fill. Same function the bar's geometry uses.
  const percent = goalPercent({
    milestones,
    start: goal.start_value,
    target: goal.target_value,
    current,
    best,
    direction: goal.direction,
  });
  const achieved = goal.status === 'achieved' || percent >= 100;
  const due = goal.deadline ? deadlineNote(goal.deadline, achieved) : null;

  return (
    <Card className={`goal-tick ${onOpen ? 'panel-hover' : ''}`}>
      {/* Stretched tap target under the content. The content ignores pointer
          events so taps fall through to it — except the notches and the pencil,
          which opt back in and keep their own jobs. */}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open ${goal.title}`}
          className="absolute inset-0 cursor-pointer rounded-xl"
        />
      ) : null}
      <div className={onOpen ? 'pointer-events-none relative' : undefined}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="mb-1.5">
              {goal.section} · {manual ? 'manual' : 'auto'}
            </CardTitle>
            <h2 className="truncate text-base font-bold">{goal.title}</h2>
          </div>

          <div className="flex shrink-0 items-start gap-1">
            <div className="text-right">
              <span
                className={`nums text-2xl font-bold ${
                  lead ? 'emissive' : achieved ? 'text-accent' : ''
                }`}
              >
                {percent}
              </span>
              <span className="label ml-0.5 text-[10px] text-muted">%</span>
            </div>
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${goal.title}`}
                className="pointer-events-auto -mr-1 rounded-full p-1.5 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <GoalBar
          milestones={milestones}
          start={goal.start_value}
          target={goal.target_value}
          current={current}
          best={best}
          unit={goal.unit}
          direction={goal.direction}
          // An auto goal's notches are derived from history — there is nothing to
          // click, and offering a tick would imply you could overrule the data.
          onToggle={manual ? onToggleMilestone : undefined}
        />

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-muted">{footnote(resolved, achieved)}</p>
          {due ? (
            <span className={`label shrink-0 text-[9px] ${due.late ? 'text-down' : 'text-muted'}`}>
              {due.text}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/** The one line under the bar: when it was done, where you are now, or the description. */
function footnote({ goal, current }: ResolvedGoal, achieved: boolean): string {
  if (achieved) return goal.achieved_at ? `Done · ${goal.achieved_at.slice(0, 10)}` : 'Done';
  if (current != null) return `Now ${fmtGoalValue(current)} ${goal.unit ?? ''}`.trim();
  return goal.description ?? '';
}
