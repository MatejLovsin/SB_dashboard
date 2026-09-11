-- Goals: a written-down target, broken into milestones, with a progress bar.
--
-- A goal is either MANUAL (you tick its milestones and type its numbers) or AUTO
-- (bound to a metric that already exists elsewhere in the app). Both render as
-- the same object -- see components/ui/GoalBar.tsx.
--
-- THE ONE ARCHITECTURAL RULE: an auto goal's progress is COMPUTED ON READ by the
-- resolver in lib/queries/goals.ts. Nothing in this schema is written back to by
-- finishing a session, saving a grade or moving a kanban card, and no trigger
-- watches those tables. That keeps the feature purely additive -- every existing
-- mutation path is untouched -- and it means an auto goal created today
-- backfills its milestone dates out of history for free.
--
-- Consequence for the two columns below: on an AUTO goal, goal_milestones
-- `completed` / `first_hit_at` are IGNORED (the resolver derives both from the
-- source data, so "once cleared, stays cleared" falls out of the fact that a
-- historical best never decreases). They are only authoritative on MANUAL goals.

create type goal_section   as enum ('fitness', 'school', 'work', 'life');
create type goal_status    as enum ('active', 'achieved', 'archived');
create type goal_source    as enum ('manual', 'auto');
create type goal_direction as enum ('up', 'down');

create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,

  section      goal_section not null,
  title        text not null,
  description  text,

  -- The numeric frame. All three may be null on a tick-only goal, in which case
  -- the bar falls back to evenly spaced count mode.
  unit         text,
  start_value  numeric,
  target_value numeric,
  direction    goal_direction not null default 'up',

  -- `metric` is the auto binding, e.g.
  --   {"kind":"exercise_best_weight","exerciseId":"<uuid>"}
  -- Shapes are the GoalMetric union in lib/queries/goals.ts, which is the single
  -- source of truth; kept as jsonb so adding a metric kind needs no migration.
  source       goal_source not null default 'manual',
  metric       jsonb,

  status       goal_status not null default 'active',
  achieved_at  timestamptz,
  deadline     date,

  pinned       boolean not null default false,
  position     integer not null default 0,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint goals_auto_needs_metric check (source = 'manual' or metric is not null)
);

create table public.goal_milestones (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id      uuid not null references public.goals (id) on delete cascade,

  -- Shown under the notch. Null falls back to the formatted `value`, so a
  -- numeric milestone needs no label.
  label        text,
  -- Null makes this a tick-only milestone.
  value        numeric,
  position     integer not null default 0,

  -- Authoritative on MANUAL goals only (see the header note).
  completed    boolean not null default false,
  -- Set the first time the milestone was cleared; never cleared afterwards, so
  -- un-ticking a manual milestone still remembers when you first got there.
  first_hit_at timestamptz,

  created_at   timestamptz not null default now()
);

-- Manual goals get a dated history, so a hand-tracked goal charts exactly like
-- an auto one instead of being the lesser half of the feature. Auto goals do not
-- write here -- their history already exists in the tables they read.
create table public.goal_checkins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id     uuid not null references public.goals (id) on delete cascade,

  value       numeric not null,
  recorded_at date not null default current_date,
  note        text,

  created_at  timestamptz not null default now()
);

create index goals_user_section_idx     on public.goals (user_id, section, status);
create index goal_milestones_goal_idx   on public.goal_milestones (goal_id, position);
create index goal_checkins_goal_idx     on public.goal_checkins (goal_id, recorded_at);

alter table public.goals            enable row level security;
alter table public.goal_milestones  enable row level security;
alter table public.goal_checkins    enable row level security;

create policy "owner" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner" on public.goal_milestones
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner" on public.goal_checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
