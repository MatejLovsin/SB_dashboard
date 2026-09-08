'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ProgrammeEmphasis, ProgrammeItem } from '@/lib/db/types';
import { fitnessKeys } from '@/lib/queries/fitness';
import { listPlans } from '@/lib/queries/plans';
import {
  listProgrammeDays,
  programmeKeys,
  upsertProgrammeDay,
  weekdayFull,
  type ProgrammeDayPatch,
  type ProgrammeDayWithPlan,
} from '@/lib/queries/programme';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { WeekProgramme } from './WeekProgramme';

// null → heavy → light → null. Accessories carry no color; only the main lifts do.
function nextEmphasis(current: ProgrammeEmphasis | null): ProgrammeEmphasis | null {
  if (current === null) return 'heavy';
  if (current === 'heavy') return 'light';
  return null;
}

const EMPHASIS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  heavy: { label: 'Heavy', color: 'var(--load-heavy)', bg: 'var(--load-heavy-soft)' },
  light: { label: 'Light', color: 'var(--load-light)', bg: 'var(--load-light-soft)' },
};

export function ProgrammeEditor() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Local copy is the render source of truth so text inputs stay responsive and
  // aren't clobbered mid-keystroke by a refetch. Writes go out on commit events.
  const [days, setDays] = useState<ProgrammeDayWithPlan[] | null>(null);
  const [newChip, setNewChip] = useState<Record<number, string>>({});

  const { data, isPending, isError, error } = useQuery({
    queryKey: programmeKeys.days(),
    queryFn: () => listProgrammeDays(supabase),
  });

  const { data: plans = [] } = useQuery({
    queryKey: fitnessKeys.plans(),
    queryFn: () => listPlans(supabase),
  });

  useEffect(() => {
    if (data) setDays((prev) => prev ?? data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: ({ weekday, patch }: { weekday: number; patch: ProgrammeDayPatch }) =>
      upsertProgrammeDay(supabase, weekday, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programmeKeys.all });
      // The Fitness hub is an RSC — refresh it so the strip reflects the edit.
      router.refresh();
    },
  });

  /** Apply a patch locally (instant) and persist it. */
  function patchDay(weekday: number, patch: ProgrammeDayPatch) {
    setDays((prev) =>
      prev
        ? prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d))
        : prev,
    );
    saveMutation.mutate({ weekday, patch });
  }

  /** Move a day's contents to the adjacent weekday, swapping with what's there. */
  function move(weekday: number, direction: -1 | 1) {
    if (!days) return;
    const target = weekday + direction;
    if (target < 1 || target > 7) return;
    const a = days.find((d) => d.weekday === weekday);
    const b = days.find((d) => d.weekday === target);
    if (!a || !b) return;

    const aContent = { label: a.label, plan_id: a.plan_id, items: a.items };
    const bContent = { label: b.label, plan_id: b.plan_id, items: b.items };
    // `planName` is derived, so it rides along locally but never goes in the patch.
    setDays((prev) =>
      prev
        ? prev.map((d) =>
            d.weekday === weekday
              ? { ...d, ...bContent, planName: b.planName }
              : d.weekday === target
                ? { ...d, ...aContent, planName: a.planName }
                : d,
          )
        : prev,
    );
    saveMutation.mutate({ weekday, patch: bContent });
    saveMutation.mutate({ weekday: target, patch: aContent });
  }

  function addChip(day: ProgrammeDayWithPlan) {
    const name = (newChip[day.weekday] ?? '').trim();
    if (!name) return;
    patchDay(day.weekday, { items: [...day.items, { name, emphasis: null }] });
    setNewChip((prev) => ({ ...prev, [day.weekday]: '' }));
  }

  function updateChip(day: ProgrammeDayWithPlan, index: number, next: ProgrammeItem | null) {
    const items = next
      ? day.items.map((it, i) => (i === index ? next : it))
      : day.items.filter((_, i) => i !== index);
    patchDay(day.weekday, { items });
  }

  if (isPending && !days) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted">
        <Spinner /> Loading programme…
      </div>
    );
  }

  if (isError && !days) {
    return (
      <div className="space-y-4">
        <PageHeader title="Weekly programme" description="Your training split." />
        <Card className="text-sm text-muted">
          Couldn&apos;t load the programme: {(error as Error)?.message ?? 'unknown error'}.
          If you haven&apos;t applied migration <code>0015_programme.sql</code> yet, do that first.
        </Card>
      </div>
    );
  }

  const list = days ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Weekly programme"
        description="Set the split, mark the main lifts heavy or light, and link each day to a plan."
      />

      {/* Live preview — the exact component the Fitness hub renders. */}
      <WeekProgramme days={list} />

      <div className="space-y-3">
        {list.map((day, i) => {
          const isRest = !day.label;
          return (
            <Card key={day.weekday} className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted">
                  {weekdayFull(day.weekday)}
                </span>

                <input
                  value={day.label ?? ''}
                  placeholder="Rest day — name it to train"
                  onChange={(e) =>
                    setDays((prev) =>
                      prev
                        ? prev.map((d) =>
                            d.weekday === day.weekday ? { ...d, label: e.target.value } : d,
                          )
                        : prev,
                    )
                  }
                  onBlur={(e) =>
                    patchDay(day.weekday, { label: e.target.value.trim() || null })
                  }
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium outline-none focus:border-accent"
                />

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(day.weekday, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${weekdayFull(day.weekday)} earlier`}
                    className="rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(day.weekday, 1)}
                    disabled={i === list.length - 1}
                    aria-label={`Move ${weekdayFull(day.weekday)} later`}
                    className="rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isRest ? (
                <p className="text-xs text-muted">
                  Rest day — give it a name above to add exercises and link a plan.
                </p>
              ) : (
                <div className="space-y-3">
                  {/* Plan link */}
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-24 shrink-0">Linked plan</span>
                    <select
                      value={day.plan_id ?? ''}
                      onChange={(e) => {
                        const planId = e.target.value || null;
                        patchDay(day.weekday, { plan_id: planId });
                        // `planName` is derived, not persisted — keep the live
                        // preview above in sync without waiting for a refetch.
                        setDays((prev) =>
                          prev
                            ? prev.map((d) =>
                                d.weekday === day.weekday
                                  ? {
                                      ...d,
                                      planName:
                                        plans.find((p) => p.id === planId)?.name ?? null,
                                    }
                                  : d,
                              )
                            : prev,
                        );
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
                    >
                      <option value="">No plan linked</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Exercise chips */}
                  <div className="space-y-1.5">
                    {day.items.map((item, index) => {
                      const style = item.emphasis ? EMPHASIS_STYLE[item.emphasis] : null;
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            value={item.name}
                            onChange={(e) =>
                              setDays((prev) =>
                                prev
                                  ? prev.map((d) =>
                                      d.weekday === day.weekday
                                        ? {
                                            ...d,
                                            items: d.items.map((it, j) =>
                                              j === index ? { ...it, name: e.target.value } : it,
                                            ),
                                          }
                                        : d,
                                    )
                                  : prev,
                              )
                            }
                            onBlur={(e) => {
                              const name = e.target.value.trim();
                              if (!name) return updateChip(day, index, null);
                              updateChip(day, index, { ...item, name });
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateChip(day, index, {
                                ...item,
                                emphasis: nextEmphasis(item.emphasis),
                              })
                            }
                            aria-label={`Toggle emphasis for ${item.name}`}
                            className="w-16 shrink-0 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors"
                            style={
                              style
                                ? { color: style.color, borderColor: style.bg, background: style.bg }
                                : undefined
                            }
                          >
                            {style ? (
                              style.label
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateChip(day, index, null)}
                            aria-label={`Remove ${item.name}`}
                            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-border/40 hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add row */}
                    <div className="flex items-center gap-2">
                      <input
                        value={newChip[day.weekday] ?? ''}
                        placeholder="Add exercise…"
                        onChange={(e) =>
                          setNewChip((prev) => ({ ...prev, [day.weekday]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addChip(day);
                          }
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-dashed border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => addChip(day)}
                        disabled={!(newChip[day.weekday] ?? '').trim()}
                        aria-label="Add exercise"
                        className="shrink-0 rounded-lg border border-border p-1.5 text-muted hover:bg-border/40 hover:text-foreground disabled:opacity-30"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="pb-2 text-xs text-muted">
        Changes save automatically. Use the arrows to shift a day earlier or later — it swaps
        places with its neighbour, so the week always stays seven days.
      </p>
    </div>
  );
}
