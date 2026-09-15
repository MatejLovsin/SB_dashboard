'use client';

import { Check } from 'lucide-react';
import type { NodeState } from './GoalTimeline';

export interface Step {
  id: string;
  /** 1-based, in rail order. */
  index: number;
  title: string;
  /** Secondary readout, e.g. the milestone's value when it also has a label. */
  detail: string | null;
  /** Already formatted, e.g. "12 Aug". */
  clearedOn: string | null;
  state: NodeState;
}

interface GoalStepsProps {
  steps: Step[];
  unlocked: string | null;
  /** Manual goals only — rows become tick targets. */
  onToggle?: (id: string) => void;
}

/**
 * The written-out milestones under the close-up timeline. Cleared steps are
 * struck through and dated, the next one is lit, the rest wait dimmed. Rows are
 * separated by hairlines — no fills, per the lit-instrument language.
 */
export function GoalSteps({ steps, unlocked, onToggle }: GoalStepsProps) {
  return (
    <ol>
      {steps.map((step) => (
        <li key={step.id} className="border-t border-border first:border-t-0">
          {onToggle ? (
            <button
              type="button"
              onClick={() => onToggle(step.id)}
              aria-pressed={step.state === 'hit'}
              className="press-flash w-full rounded-md text-left transition-colors hover:bg-card"
            >
              <StepRow step={step} unlocked={unlocked === step.id} />
            </button>
          ) : (
            <StepRow step={step} unlocked={false} />
          )}
        </li>
      ))}
    </ol>
  );
}

function StepRow({ step, unlocked }: { step: Step; unlocked: boolean }) {
  const { state } = step;
  return (
    <div className="relative flex items-center gap-3 py-3 pl-3 pr-2">
      {state === 'next' ? (
        <span
          className="absolute inset-y-2.5 left-0 w-[2px] rounded-full bg-accent"
          style={{ boxShadow: '0 0 8px rgba(var(--accent-rgb), 0.6)' }}
        />
      ) : null}

      <span className={`nums w-5 shrink-0 text-[11px] ${state === 'next' ? 'text-accent' : 'text-muted opacity-60'}`}>
        {String(step.index).padStart(2, '0')}
      </span>

      <Mark state={state} unlocked={unlocked} />

      <span className={`min-w-0 flex-1 truncate text-sm ${titleTone(state)}`}>{step.title}</span>

      {step.detail ? (
        <span className={`nums shrink-0 text-[11px] ${state === 'hit' ? 'text-muted opacity-60' : 'text-muted'}`}>
          {step.detail}
        </span>
      ) : null}

      {state === 'next' ? (
        <span className="label w-14 shrink-0 text-right text-[9px] text-accent">Next</span>
      ) : (
        <span className="label w-14 shrink-0 text-right text-[9px] text-muted opacity-70">
          {state === 'hit' ? step.clearedOn : ''}
        </span>
      )}
    </div>
  );
}

function titleTone(state: NodeState): string {
  if (state === 'hit') return 'text-muted line-through decoration-muted';
  if (state === 'next') return 'font-semibold text-accent';
  if (state === 'skipped') return 'text-foreground opacity-80';
  return 'text-foreground opacity-55';
}

function Mark({ state, unlocked }: { state: NodeState; unlocked: boolean }) {
  if (state === 'hit') {
    return (
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent ${
          unlocked ? 'goal-node-pop' : ''
        }`}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'next') {
    return <span className="goal-next h-4 w-4 shrink-0 rounded-full border-2 border-accent" />;
  }
  return (
    <span
      className={`h-4 w-4 shrink-0 rounded-full border ${state === 'skipped' ? 'border-accent' : 'border-muted opacity-60'}`}
    />
  );
}
