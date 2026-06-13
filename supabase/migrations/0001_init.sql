-- Personal Dashboard — initial schema
-- Single-user app: every table is scoped to auth.uid() via RLS.
-- Run this in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Extensions & shared helpers
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Auto-maintain updated_at on tables that have the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.roadmap_status as enum ('idea', 'planned', 'in_progress', 'done');
create type public.priority       as enum ('low', 'medium', 'high');
create type public.ai_section     as enum ('fitness', 'school', 'work');

-- ===========================================================================
-- FITNESS
-- ===========================================================================

-- Exercise dictionary (autocomplete source).
create table public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  category   text,                                   -- optional push/pull/legs/other tag
  notes      text,                                   -- optional form cues / setup reminders
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Saved workout templates ("Push A").
create table public.workout_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  category   text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

-- Template lines belonging to a plan.
create table public.plan_exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id       uuid not null references public.workout_plans (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete restrict,
  target_sets   int,
  target_reps   int,
  target_weight numeric(6, 2),
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index plan_exercises_plan_id_idx on public.plan_exercises (plan_id, position);

-- A logged workout session.
create table public.workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_id      uuid references public.workout_plans (id) on delete set null,
  title        text,                                  -- snapshot of plan name
  performed_at timestamptz not null default now(),
  notes        text,
  created_at   timestamptz not null default now()
);
create index workout_sessions_performed_at_idx on public.workout_sessions (user_id, performed_at desc);

-- Each logged set (the core write path).
create table public.session_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id  uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_number  int not null,
  reps        int,
  weight      numeric(6, 2),
  completed   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index session_sets_exercise_idx on public.session_sets (exercise_id, created_at);
create index session_sets_session_idx on public.session_sets (session_id);

-- ===========================================================================
-- SCHOOL
-- ===========================================================================

create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  color      text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.exams (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id           uuid not null references public.subjects (id) on delete cascade,
  title                text,
  exam_date            date not null,
  perceived_difficulty int check (perceived_difficulty between 1 and 5),
  grade                numeric,
  target_study_hours   numeric,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();
create index exams_subject_idx on public.exams (subject_id, exam_date);

create table public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id       uuid not null references public.subjects (id) on delete cascade,
  exam_id          uuid references public.exams (id) on delete set null,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_seconds int not null,
  note             text,
  created_at       timestamptz not null default now()
);
create index study_sessions_subject_idx on public.study_sessions (subject_id, started_at);

-- ===========================================================================
-- WORK
-- ===========================================================================

create table public.roadmap_cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  status      public.roadmap_status not null default 'idea',
  priority    public.priority,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger roadmap_cards_set_updated_at
  before update on public.roadmap_cards
  for each row execute function public.set_updated_at();
create index roadmap_cards_status_idx on public.roadmap_cards (user_id, status, position);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null,
  body       text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search     tsvector generated always as (
               to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
             ) stored
);
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();
create index notes_search_idx on public.notes using gin (search);
create index notes_entry_date_idx on public.notes (user_id, entry_date desc);

-- ===========================================================================
-- AI
-- ===========================================================================

-- One cached summary per section (upserted on regenerate).
create table public.ai_summaries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  section      public.ai_section not null,
  content      text not null,
  model        text not null,
  generated_at timestamptz not null default now(),
  unique (user_id, section)
);

-- ===========================================================================
-- ROW-LEVEL SECURITY
-- Every table: owner-only access via auth.uid() = user_id.
-- ===========================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'exercises', 'workout_plans', 'plan_exercises', 'workout_sessions', 'session_sets',
    'subjects', 'exams', 'study_sessions',
    'roadmap_cards', 'notes',
    'ai_summaries'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$
      create policy %1$s_select on public.%1$I
        for select using (auth.uid() = user_id);
    $p$, t);
    execute format($p$
      create policy %1$s_insert on public.%1$I
        for insert with check (auth.uid() = user_id);
    $p$, t);
    execute format($p$
      create policy %1$s_update on public.%1$I
        for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $p$, t);
    execute format($p$
      create policy %1$s_delete on public.%1$I
        for delete using (auth.uid() = user_id);
    $p$, t);
  end loop;
end;
$$;
