-- Auto-link each programme day to an existing workout plan by name/category.
--
-- 0015 seeds the split (Mon Push, Tue Pull, ...) but leaves `plan_id` null, so
-- every day card would point at the editor until you picked five dropdowns by
-- hand. This matches the day's label against the plans you already have.
--
-- Kept as its own migration (rather than folded into 0015) so it runs correctly
-- whether or not 0015 has already been applied.
--
-- Only fills days that are still unlinked, so re-running it never overwrites a
-- choice you made in the editor. Safe to run more than once.

update public.programme_days pd
set plan_id = (
  select p.id
  from public.workout_plans p
  where p.user_id = pd.user_id
    and (
      lower(p.name) = lower(pd.label)
      or lower(p.category) = lower(pd.label)
      -- "Push A" / "Push day" also match the "Push" slot
      or lower(p.name) like lower(pd.label) || ' %'
    )
  order by
    (lower(p.name) = lower(pd.label)) desc,      -- exact name beats
    (lower(p.category) = lower(pd.label)) desc,  -- category, which beats
    p.updated_at desc                            -- a prefix match; newest wins
  limit 1
),
updated_at = now()
where pd.label is not null
  and pd.plan_id is null;
