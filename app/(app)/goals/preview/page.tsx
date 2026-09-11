'use client';

// SANDBOX — throwaway preview of the goal progress bar against fake data, so the
// visual can be judged before any schema is written. Not linked from SideNav.
// Delete (or convert) this route once /goals is real.

import { useMemo, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { GoalBar, goalPercent, fmtGoalValue, type GoalBarMilestone } from '@/components/ui/GoalBar';

type Theme = 'fitness' | 'school' | 'work' | 'home';

interface DemoGoal {
  title: string;
  section: string;
  source: 'auto' | 'manual';
  start?: number | null;
  target?: number | null;
  current?: number | null;
  unit?: string;
  direction?: 'up' | 'down';
  milestones: GoalBarMilestone[];
  meta?: string;
}

function ms(values: number[], clearedUpTo: number): GoalBarMilestone[] {
  return values.map((v) => ({ id: `m${v}`, value: v, completed: v <= clearedUpTo }));
}

/* ── The card that wraps the bar ─────────────────────────────────────────── */

function GoalCard({ goal, lead = false, onToggle }: { goal: DemoGoal; lead?: boolean; onToggle?: (id: string) => void }) {
  const pct = goalPercent(goal);
  const done = pct >= 100;
  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="mb-1.5">
            {goal.section} · {goal.source}
          </CardTitle>
          <h2 className="truncate text-base font-bold">{goal.title}</h2>
        </div>
        <div className="shrink-0 text-right">
          <span className={`nums text-2xl font-bold ${lead ? 'emissive' : done ? 'text-accent' : ''}`}>
            {pct}
          </span>
          <span className="label ml-0.5 text-[10px] text-muted">%</span>
        </div>
      </div>

      <GoalBar {...goal} onToggle={onToggle} />

      {goal.meta ? <p className="mt-3 text-xs text-muted">{goal.meta}</p> : null}
    </Card>
  );
}

/* ── Compact card for the hub rail ───────────────────────────────────────── */

function GoalStripCard({ goal }: { goal: DemoGoal }) {
  const pct = goalPercent(goal);
  return (
    <Card className="panel-hover press-flash cursor-pointer">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold">{goal.title}</span>
        <span className="nums shrink-0 text-sm font-bold text-accent">{pct}%</span>
      </div>
      <GoalBar {...goal} size="strip" />
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

function Themed({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return <div data-theme={theme}>{children}</div>;
}

export default function GoalPreviewPage() {
  /* The hero: drag `current` and watch the fill move, notches unlock and — when
     you drag back down — the cleared ones hold while the slip mark appears. */
  const values = [45, 50, 55];
  const [current, setCurrent] = useState(52.5);
  const [cleared, setCleared] = useState<number[]>([45, 50]);

  // Clearing happens where the value changes, not in an effect watching it — a
  // cleared milestone never un-clears, so the set only ever grows.
  function simulate(next: number) {
    setCurrent(next);
    setCleared((prev) => {
      const grown = values.filter((v) => v <= next || prev.includes(v));
      return grown.length === prev.length ? prev : grown;
    });
  }

  const hero: DemoGoal = {
    title: 'Dumbbell press 60 kg',
    section: 'Fitness',
    source: 'auto',
    start: 40,
    target: 60,
    current,
    unit: 'kg',
    milestones: values.map((v) => ({ id: `h${v}`, value: v, completed: cleared.includes(v) })),
    meta: `best set ${fmtGoalValue(current)} kg · from session_sets, no manual entry`,
  };

  /* Tick-only manual goal — no numbers anywhere, so the bar falls back to count
     mode and spaces its notches evenly. Click them. */
  const [ticks, setTicks] = useState<string[]>(['t1']);
  const manual: DemoGoal = {
    title: 'Get the driving licence',
    section: 'Life',
    source: 'manual',
    milestones: [
      { id: 't1', label: 'Theory' },
      { id: 't2', label: 'First lesson' },
      { id: 't3', label: 'Night drive' },
      { id: 't4', label: 'Exam booked' },
      { id: 't5', label: 'Passed' },
    ].map((m) => ({ ...m, completed: ticks.includes(m.id) })),
    meta: 'no numeric source — evenly spaced, click a notch to clear it',
  };

  const states: DemoGoal[] = useMemo(
    () => [
      {
        title: 'Just created',
        section: 'Fitness',
        source: 'auto',
        start: 100,
        target: 140,
        current: 100,
        unit: 'kg',
        milestones: ms([110, 120, 130], 0),
        meta: 'nothing cleared — the bar is a bare hairline',
      },
      {
        title: 'Slipped back',
        section: 'Fitness',
        source: 'auto',
        start: 40,
        target: 60,
        current: 51,
        unit: 'kg',
        milestones: ms([45, 50, 55], 55),
        meta: 'cleared 55 once — fill holds, hollow mark shows where you are now',
      },
      {
        title: 'Bodyweight 75 kg',
        section: 'Fitness',
        source: 'auto',
        start: 82,
        target: 75,
        current: 78.4,
        unit: 'kg',
        direction: 'down',
        milestones: [
          { id: 'd80', value: 80, completed: true },
          { id: 'd78', value: 78, completed: false },
          { id: 'd76', value: 76, completed: false },
        ],
        meta: 'direction: down — same formula, mirrored',
      },
      {
        title: 'Read 12 books this year',
        section: 'Life',
        source: 'manual',
        start: 0,
        target: 12,
        current: 12,
        unit: '',
        milestones: ms([3, 6, 9], 12),
        meta: 'achieved — the shelf copy, with its date',
      },
    ],
    [],
  );

  const school: DemoGoal = {
    title: 'Average grade 4.5',
    section: 'School',
    source: 'auto',
    start: 3.2,
    target: 4.5,
    current: 4.05,
    milestones: [
      { id: 's1', value: 3.5, completed: true },
      { id: 's2', value: 4.0, completed: true },
      { id: 's3', value: 4.25, completed: false },
    ],
    meta: 'reads exams.grade — recomputed on every page load',
  };

  const work: DemoGoal = {
    title: 'Ship 25 roadmap cards',
    section: 'Work',
    source: 'auto',
    start: 0,
    target: 25,
    current: 14,
    milestones: ms([5, 10, 15, 20], 10),
    meta: 'counts roadmap_cards where status = done',
  };

  const strip: DemoGoal[] = [
    { ...hero, title: 'DB press 60 kg' },
    {
      title: 'Pull-up ×15',
      section: 'Fitness',
      source: 'auto',
      start: 6,
      target: 15,
      current: 11,
      milestones: ms([8, 10, 12], 10),
    },
    {
      title: '100 km run total',
      section: 'Fitness',
      source: 'auto',
      start: 0,
      target: 100,
      current: 38,
      unit: 'km',
      milestones: ms([25, 50, 75], 25),
    },
  ];

  return (
    <div className="space-y-4 pb-16">
      <PageHeader
        eyebrow="Sandbox"
        title="Goal bar"
        description="Fake data. Drag the slider on the hero, click the notches on the manual goal."
      />

      {/* 1 — the hero, interactive */}
      <Themed theme="fitness">
        <GoalCard goal={hero} lead />
        <div className="mt-3 flex items-center gap-3 px-1">
          <span className="label shrink-0 text-[10px] text-muted">simulate a PR</span>
          <input
            type="range"
            min={40}
            max={60}
            step={0.5}
            value={current}
            onChange={(e) => simulate(Number(e.target.value))}
            className="h-1 w-full max-w-sm cursor-pointer appearance-none rounded-full bg-border accent-[var(--accent)]"
          />
          <span className="nums shrink-0 text-sm">{fmtGoalValue(current)} kg</span>
        </div>
      </Themed>

      {/* 2 — the tick-only manual goal */}
      <Themed theme="home">
        <GoalCard
          goal={manual}
          onToggle={(id) =>
            setTicks((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
          }
        />
      </Themed>

      {/* 3 — the edge states, side by side */}
      <div>
        <CardTitle className="mb-2">States</CardTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {states.map((g) => (
            <Themed key={g.title} theme="fitness">
              <GoalCard goal={g} />
            </Themed>
          ))}
        </div>
      </div>

      {/* 4 — the other two section accents */}
      <div>
        <CardTitle className="mb-2">Section accents</CardTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Themed theme="school">
            <GoalCard goal={school} />
          </Themed>
          <Themed theme="work">
            <GoalCard goal={work} />
          </Themed>
        </div>
      </div>

      {/* 5 — the hub rail: what /fitness would carry under the programme strip */}
      <div>
        <CardTitle className="mb-2">Hub strip (compact)</CardTitle>
        <Themed theme="fitness">
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {strip.map((g) => (
              <div key={g.title} className="w-[72%] shrink-0 snap-start lg:w-auto">
                <GoalStripCard goal={g} />
              </div>
            ))}
          </div>
        </Themed>
      </div>

      {/* 6 — long title, phone measure */}
      <div>
        <CardTitle className="mb-2">Long title at phone width</CardTitle>
        <div className="max-w-[360px]">
          <Themed theme="fitness">
            <GoalCard
              goal={{
                ...hero,
                title: 'Incline dumbbell bench press 60 kg for 8 reps',
                meta: 'Martian Mono is wide — check the truncation',
              }}
            />
          </Themed>
        </div>
      </div>
    </div>
  );
}
