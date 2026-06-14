-- Pinned lifts: surface a couple of "most important" exercises on the Fitness
-- hub with their strength-trend mini charts. RLS already covers exercises
-- (owner-only via 0001), so this only adds a column.

alter table public.exercises
  add column if not exists pinned boolean not null default false;

-- Seed: pin the user's squat and bench if they already exist. New users can
-- pin/unpin any exercise from the Manage exercises screen.
update public.exercises
  set pinned = true
  where name ilike '%squat%' or name ilike '%bench%';

-- Fast lookup of the (small) pinned set.
create index if not exists exercises_pinned_idx
  on public.exercises (user_id) where pinned;
