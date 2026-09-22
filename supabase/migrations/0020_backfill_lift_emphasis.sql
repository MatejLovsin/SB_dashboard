-- Backfill the emphasis snapshot for sessions logged since the split started.
--
-- 0019 adds the columns, but only sessions started AFTER it can snapshot
-- themselves. The light/heavy split began Wednesday 2026-09-16, so the sessions
-- logged between then and 0019 landing carry '{}' and would fold into the main
-- est-1RM line — the exact zigzag the split exists to remove. This stamps them
-- from their plan, retroactively.
--
-- ORDER MATTERS. Run this AFTER setting heavy/light on the plan lines in the
-- plan editor; a plan with no emphasis set stamps nothing. It is re-runnable
-- (like 0016) precisely so you can: set the chips, run it, set more, run again.
--
-- It never overwrites. Only sessions still at '{}' are touched, so a label you
-- corrected by hand on a session, and anything 0019 already snapshotted, stays
-- exactly as it is.
--
-- The cutoff is UTC midnight on the 16th, which is 02:00 local — so all of
-- Tuesday the 15th is excluded whichever way the clock leans. Sessions before
-- the cutoff keep '{}' on purpose: back then there was one intensity, and
-- unclassified days are read as the main series anyway.

update public.workout_sessions ws
set emphasis = coalesce(
  (
    select jsonb_object_agg(line.exercise_id::text, line.emphasis)
    from (
      -- distinct on: a plan may list the same exercise twice; first position wins
      select distinct on (pe.exercise_id) pe.exercise_id, pe.emphasis
      from public.plan_exercises pe
      where pe.plan_id = ws.plan_id
        and pe.user_id = ws.user_id
        and pe.emphasis is not null
      order by pe.exercise_id, pe.position
    ) line
  ),
  '{}'::jsonb
)
where ws.plan_id is not null
  and ws.performed_at >= timestamptz '2026-09-16 00:00:00+00'
  and ws.emphasis = '{}'::jsonb;
