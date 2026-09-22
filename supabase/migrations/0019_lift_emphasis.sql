-- Heavy / light emphasis, so the est-1RM charts stop reading a light day as a
-- regression.
--
-- With one heavy and two light sessions a week on the same lift, a single
-- connected line zigzags ~12% and hides the actual trend. The fix is to compare
-- like with like: heavy days form one series, light days another.
--
-- WHERE THE LABEL LIVES. Two columns, on purpose:
--
--   plan_exercises.emphasis  -- the INTENT. "Incline press is a light one in
--                               the Lower day plan." Set once in the plan
--                               editor. This is the right home for it because
--                               plan_exercises already carries a real
--                               exercise_id; programme_days.items deliberately
--                               does NOT (see 0015) -- its names are decorative
--                               shorthand for the strip, and matching "DB incl"
--                               against an exercise name would be guesswork.
--
--   workout_sessions.emphasis -- the RECORD. A snapshot of the above, taken when
--                               the session is started from a plan, keyed by
--                               exercise_id:  { "<uuid>": "heavy", ... }
--
-- The snapshot is what makes the chart trustworthy. programme_days holds seven
-- rows rewritten in place and plans are edited freely, so neither remembers what
-- last March looked like. Deriving emphasis live from them would silently
-- relabel every past session the next time the split changes. Sessions record
-- what happened; plans record what was meant to happen.
--
-- Sessions predating this migration keep '{}' -- unclassified, which the charts
-- fold into the main series rather than inventing a label for.

alter table public.plan_exercises
  add column emphasis text check (emphasis in ('heavy', 'light'));

comment on column public.plan_exercises.emphasis is
  'heavy = near-failure, light = technique/volume, null = accessory (no split).';

alter table public.workout_sessions
  add column emphasis jsonb not null default '{}'::jsonb;

comment on column public.workout_sessions.emphasis is
  'Snapshot of plan_exercises.emphasis at session start: { exercise_id: "heavy" | "light" }.';
