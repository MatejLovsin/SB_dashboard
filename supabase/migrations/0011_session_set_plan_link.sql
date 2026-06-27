-- Link each session set back to the plan set it was seeded from.
--
-- Starting a workout from a plan copies every plan set into a session set. Recording
-- that origin lets "Finish workout" auto-progress the plan: if you overperform a set
-- (higher estimated 1RM, never lowering the weight) the matching plan target ratchets up.
-- Sets you add mid-session have a null plan_set_id and never touch the plan.
-- Run in the Supabase SQL editor after 0010_todos.sql.

alter table public.session_sets
  add column if not exists plan_set_id uuid references public.plan_sets (id) on delete set null;

create index if not exists session_sets_plan_set_idx on public.session_sets (plan_set_id);
