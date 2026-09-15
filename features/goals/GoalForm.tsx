'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, inputClasses } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { createClient } from '@/lib/supabase/client';
import {
  GOAL_SECTIONS,
  createGoal,
  deleteGoal,
  metricDef,
  metricsForSection,
  replaceMilestones,
  setGoalStatus,
  updateGoal,
  type GoalMetric,
  type GoalMetricKind,
  type MetricOptions,
} from '@/lib/queries/goals';
import type { Goal, GoalDirection, GoalSection } from '@/lib/db/types';

interface GoalFormProps {
  options: MetricOptions;
  goal?: Goal; // omit to create
  milestones?: Array<{ id: string; label: string | null; value: number | null }>;
  onSaved: () => void;
  onCancel: () => void;
}

interface MilestoneRow {
  id?: string; // present for an existing milestone; omit for one added this session
  label: string;
  value: string;
}

const num = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label mb-1.5 block text-[10px] text-muted">{label}</span>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function GoalForm({ options, goal, milestones = [], onSaved, onCancel }: GoalFormProps) {
  const editing = Boolean(goal);
  const initialMetric = (goal?.metric ?? null) as GoalMetric | null;

  const [section, setSection] = useState<GoalSection>(goal?.section ?? 'fitness');
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [auto, setAuto] = useState(goal ? goal.source === 'auto' : false);
  const [kind, setKind] = useState<GoalMetricKind | ''>(initialMetric?.kind ?? '');

  // One bag for every metric argument — which of them matter is decided by the
  // selected kind's definition, so switching kinds keeps what still applies.
  const [args, setArgs] = useState({
    exerciseId: (initialMetric as { exerciseId?: string })?.exerciseId ?? '',
    subjectId: (initialMetric as { subjectId?: string })?.subjectId ?? '',
    examId: (initialMetric as { examId?: string })?.examId ?? '',
    boardId: (initialMetric as { boardId?: string })?.boardId ?? '',
    activity: (initialMetric as { activity?: string })?.activity ?? '',
    label: (initialMetric as { label?: string })?.label ?? '',
    weight: String((initialMetric as { weight?: number })?.weight ?? ''),
  });

  const [unit, setUnit] = useState(goal?.unit ?? '');
  const [startValue, setStartValue] = useState(goal?.start_value?.toString() ?? '');
  const [targetValue, setTargetValue] = useState(goal?.target_value?.toString() ?? '');
  const [direction, setDirection] = useState<GoalDirection>(goal?.direction ?? 'up');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [pinned, setPinned] = useState(goal?.pinned ?? false);

  const [rows, setRows] = useState<MilestoneRow[]>(
    milestones.length
      ? milestones.map((m) => ({ id: m.id, label: m.label ?? '', value: m.value?.toString() ?? '' }))
      : [{ label: '', value: '' }],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kinds = useMemo(() => metricsForSection(section), [section]);
  const def = kind ? metricDef(kind) : undefined;
  const needs = def ? [...def.args, ...(def.optional ?? [])] : [];

  function pickKind(next: GoalMetricKind | '') {
    setKind(next);
    const d = next ? metricDef(next) : undefined;
    if (!d) return;
    // Prefill the frame from the metric so the common case is one less decision.
    if (!unit && d.unit) setUnit(d.unit);
    if (d.defaultDirection) setDirection(d.defaultDirection);
  }

  function buildMetric(): GoalMetric | null {
    if (!kind || !def) return null;
    const m: Record<string, unknown> = { kind };
    if (needs.includes('exercise')) m.exerciseId = args.exerciseId;
    if (needs.includes('subject')) m.subjectId = args.subjectId || null;
    if (needs.includes('exam')) m.examId = args.examId;
    if (needs.includes('board')) m.boardId = args.boardId || null;
    if (needs.includes('activity')) m.activity = args.activity || null;
    if (needs.includes('label')) m.label = args.label;
    if (needs.includes('weight')) m.weight = num(args.weight);
    return m as GoalMetric;
  }

  function validate(): string | null {
    if (!title.trim()) return 'Give the goal a title.';
    if (auto) {
      if (!kind || !def) return 'Pick what this goal tracks.';
      for (const arg of def.args) {
        const value =
          arg === 'exercise' ? args.exerciseId
          : arg === 'subject' ? args.subjectId
          : arg === 'exam' ? args.examId
          : arg === 'board' ? args.boardId
          : arg === 'activity' ? args.activity
          : arg === 'label' ? args.label
          : args.weight;
        if (!String(value).trim()) return `This metric needs a ${arg}.`;
      }
    }
    const start = num(startValue);
    const target = num(targetValue);
    if ((start == null) !== (target == null)) {
      return 'Set both a start and a target, or neither.';
    }
    if (start != null && target != null && start === target) {
      return 'Start and target have to differ.';
    }
    if (rows.every((r) => !r.label.trim() && !r.value.trim())) {
      return 'Add at least one milestone.';
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);

    const cleaned = rows
      .filter((r) => r.label.trim() || r.value.trim())
      .map((r) => ({ id: r.id, label: r.label.trim() || null, value: num(r.value) }));

    const payload = {
      section,
      title: title.trim(),
      description: description.trim() || null,
      unit: unit.trim() || null,
      start_value: num(startValue),
      target_value: num(targetValue),
      direction,
      source: auto ? ('auto' as const) : ('manual' as const),
      metric: auto ? buildMetric() : null,
      deadline: deadline || null,
      pinned,
    };

    try {
      const supabase = createClient();
      if (goal) {
        await updateGoal(supabase, goal.id, payload);
        await replaceMilestones(supabase, goal.id, cleaned);
      } else {
        await createGoal(supabase, payload, cleaned);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the goal.');
      setSaving(false);
    }
  }

  async function remove() {
    if (!goal) return;
    setSaving(true);
    try {
      await deleteGoal(createClient(), goal.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the goal.');
      setSaving(false);
    }
  }

  async function shelve() {
    if (!goal) return;
    setSaving(true);
    try {
      await setGoalStatus(createClient(), goal.id, goal.status === 'achieved' ? 'active' : 'achieved');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the goal.');
      setSaving(false);
    }
  }

  const optionList = (arg: string): Array<{ id: string; name: string }> =>
    arg === 'exercise' ? options.exercises
    : arg === 'subject' ? options.subjects
    : arg === 'exam' ? options.exams
    : arg === 'board' ? options.boards
    : arg === 'activity' ? options.activities.map((a) => ({ id: a, name: a }))
    : options.metricLabels.map((l) => ({ id: l, name: l }));

  return (
    <div className="space-y-5">
      <Field label="Section">
        <div className="flex flex-wrap gap-1.5">
          {GOAL_SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSection(s);
                setKind('');
              }}
              className={`press-flash rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                section === s
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Field>

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Dumbbell press 60 kg"
      />

      <Field label="Note (optional)">
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why this one matters."
        />
      </Field>

      {/* ── Tracking ── */}
      <Field
        label="Tracking"
        hint={
          auto
            ? 'Read from data you already log. Milestones clear themselves, and past ones backfill their dates.'
            : 'You tick the milestones and log the numbers yourself.'
        }
      >
        <div className="flex gap-1.5">
          {[
            { value: false, label: 'Manual' },
            { value: true, label: 'Automatic' },
          ].map((mode) => (
            <button
              key={String(mode.value)}
              type="button"
              onClick={() => setAuto(mode.value)}
              className={`press-flash flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                auto === mode.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:text-foreground'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </Field>

      {auto ? (
        <div className="space-y-4">
          <Field label="Tracks" hint={def?.hint}>
            <select
              value={kind}
              onChange={(e) => pickKind(e.target.value as GoalMetricKind | '')}
              className={inputClasses}
            >
              <option value="">Choose a metric…</option>
              {kinds.map((m) => (
                <option key={m.kind} value={m.kind}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          {needs
            .filter((arg) => arg !== 'weight')
            .map((arg) => {
              const list = optionList(arg);
              const key = (
                arg === 'exercise' ? 'exerciseId'
                : arg === 'subject' ? 'subjectId'
                : arg === 'exam' ? 'examId'
                : arg === 'board' ? 'boardId'
                : arg === 'activity' ? 'activity'
                : 'label'
              ) as keyof typeof args;
              const isOptional = def?.optional?.includes(arg) ?? false;
              return (
                <Field key={arg} label={arg === 'label' ? 'Metric label' : arg}>
                  <select
                    value={args[key]}
                    onChange={(e) => setArgs({ ...args, [key]: e.target.value })}
                    className={inputClasses}
                  >
                    <option value="">{isOptional ? 'All' : 'Choose…'}</option>
                    {list.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {list.length === 0 ? (
                    <p className="mt-1 text-xs text-muted">Nothing logged under this yet.</p>
                  ) : null}
                </Field>
              );
            })}

          {needs.includes('weight') ? (
            <Input
              label="At weight (kg)"
              value={args.weight}
              onChange={(e) => setArgs({ ...args, weight: e.target.value })}
              inputMode="decimal"
              placeholder="100"
            />
          ) : null}
        </div>
      ) : null}

      {/* ── The numeric frame ── */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Start"
          value={startValue}
          onChange={(e) => setStartValue(e.target.value)}
          inputMode="decimal"
          placeholder="40"
        />
        <Input
          label="Target"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          inputMode="decimal"
          placeholder="60"
        />
        <Input
          label="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="kg"
        />
      </div>
      <p className="-mt-3 text-xs text-muted">
        Leave all three empty for a goal with no numbers — the bar then spaces its milestones
        evenly and fills as you tick them.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Counts">
          <div className="flex gap-1.5">
            {(['up', 'down'] as GoalDirection[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`press-flash flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                  direction === d
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {d === 'up' ? 'Up' : 'Down'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Deadline (optional)">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClasses}
          />
        </Field>
      </div>

      {/* ── Milestones ── */}
      <Field
        label="Milestones"
        hint="Give them values to space the bar to scale; leave values empty for plain checkpoints."
      >
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.label}
                onChange={(e) =>
                  setRows(rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
                }
                placeholder={`Step ${i + 1}`}
                className={`${inputClasses} min-w-0 flex-1`}
              />
              <input
                value={row.value}
                onChange={(e) =>
                  setRows(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                }
                placeholder="45"
                inputMode="decimal"
                className={`${inputClasses} w-24! shrink-0 text-center`}
              />
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                aria-label={`Remove milestone ${i + 1}`}
                className="rounded-full p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setRows([...rows, { label: '', value: '' }])}
          className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </button>
      </Field>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Pin to the top of the list
      </label>

      {error ? <p className="text-sm text-down">{error}</p> : null}

      <div className="flex items-center gap-2 pt-1">
        <Button onClick={save} disabled={saving} className="flex-1">
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create goal'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>

      {editing ? (
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={shelve} disabled={saving}>
            {goal?.status === 'achieved' ? 'Reopen' : 'Mark achieved'}
          </Button>
          <Button variant="danger" size="sm" onClick={remove} disabled={saving}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}
