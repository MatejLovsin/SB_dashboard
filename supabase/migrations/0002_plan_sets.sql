-- Per-set plan templates.
--
-- Originally a plan exercise carried a single target_sets/target_reps/target_weight.
-- Switch to one row per set so each set in a plan can have its own reps + weight.
-- Run this in the Supabase SQL editor after 0001_init.sql.

create table public.plan_sets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_exercise_id uuid not null references public.plan_exercises (id) on delete cascade,
  position         int not null default 0,                 -- set order within the exercise
  target_reps      int,
  target_weight    numeric(6, 2),
  created_at       timestamptz not null default now()
);
create index plan_sets_plan_exercise_idx on public.plan_sets (plan_exercise_id, position);

-- Owner-only RLS, same pattern as every other table.
alter table public.plan_sets enable row level security;
create policy plan_sets_select on public.plan_sets
  for select using (auth.uid() = user_id);
create policy plan_sets_insert on public.plan_sets
  for insert with check (auth.uid() = user_id);
create policy plan_sets_update on public.plan_sets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy plan_sets_delete on public.plan_sets
  for delete using (auth.uid() = user_id);

-- Targets now live per-set; drop the aggregate columns from plan_exercises.
alter table public.plan_exercises
  drop column if exists target_sets,
  drop column if exists target_reps,
  drop column if exists target_weight;
