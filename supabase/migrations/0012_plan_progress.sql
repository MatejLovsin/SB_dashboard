-- Auto-progressing premade plans, take 2: make progression recompute-from-history
-- instead of a one-way ratchet, and persist what each session changed.
--
-- Run in the Supabase SQL editor after 0011_session_set_plan_link.sql.

-- 1) Baseline floor per plan set. `target_*` is the effective (possibly progressed)
--    target; `base_*` is what you (or a manual edit) intentionally set. Progression can
--    raise target above base but never derives a target below base — so a weak/deload day
--    never lowers the plan, yet correcting a bad set recomputes the target back down.
alter table public.plan_sets
  add column if not exists base_reps integer,
  add column if not exists base_weight numeric;

-- Backfill existing rows: their current target IS their baseline.
update public.plan_sets
  set base_reps = coalesce(base_reps, target_reps),
      base_weight = coalesce(base_weight, target_weight)
  where base_reps is null and base_weight is null;

-- 2) Persist the plan changes a session caused, so the "Plan updated" banner can be
--    shown when viewing a past session or comparing sessions. Shape:
--    [{ exerciseName, from: { weight, reps }, to: { weight, reps } }]
alter table public.workout_sessions
  add column if not exists plan_updates jsonb;
