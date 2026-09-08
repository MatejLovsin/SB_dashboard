-- Weekly programme: the training split pinned to the top of /fitness.
--
-- Exactly 7 rows per user, one per ISO weekday (1=Mon .. 7=Sun). A row with a
-- null `label` is a REST day; giving it a label turns it into a training day.
-- That fixed-7 shape makes "which day is today?" a single weekday lookup and
-- means add/remove/reorder never inserts or deletes rows -- it only rewrites
-- (label, plan_id, items) in place. Uniqueness on (user_id, weekday) enforces it.
--
-- `items` is the day's shorthand exercise list used ONLY for the compact strip:
--   [{ "name": "DB incl", "emphasis": "heavy" | "light" | null }, ...]
-- It is deliberately decoupled from `plan_id` -- the strip needs terse labels
-- ("DB incl") that stay stable even when the linked plan changes, and the
-- heavy/light emphasis has no equivalent anywhere in the plan schema.

create table public.programme_days (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 7),
  label      text,
  plan_id    uuid references public.workout_plans (id) on delete set null,
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekday)
);

alter table public.programme_days enable row level security;

create policy "owner" on public.programme_days
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Seed every existing user with the current 5-day split:
-- Mon Push · Tue Pull · Wed Legs · Thu Rest · Fri Upper · Sat Lower · Sun Rest.
-- Four main lifts (DB incl, Dips, Pullup, Row) are heavy on Push/Pull and light
-- on Legs/Upper/Lower.
insert into public.programme_days (user_id, weekday, label, items)
select u.id, d.weekday, d.label, d.items
from auth.users u
cross join (values
  (1, 'Push', '[
    {"name":"DB incl","emphasis":"heavy"},
    {"name":"Dips","emphasis":"heavy"},
    {"name":"Lateral","emphasis":null},
    {"name":"Smith","emphasis":null},
    {"name":"Shoulder","emphasis":null},
    {"name":"Tricep","emphasis":null}
  ]'::jsonb),
  (2, 'Pull', '[
    {"name":"Pullup","emphasis":"heavy"},
    {"name":"Row","emphasis":"heavy"},
    {"name":"Bicep DB","emphasis":null},
    {"name":"Cable row","emphasis":null},
    {"name":"Preacher","emphasis":null},
    {"name":"Reverse","emphasis":null},
    {"name":"Pulldown","emphasis":null}
  ]'::jsonb),
  (3, 'Legs', '[
    {"name":"SL press","emphasis":null},
    {"name":"RDL","emphasis":null},
    {"name":"Pullup","emphasis":"light"},
    {"name":"DB incl","emphasis":"light"},
    {"name":"Calf","emphasis":null},
    {"name":"Abs","emphasis":null}
  ]'::jsonb),
  (4, null, '[]'::jsonb),
  (5, 'Upper', '[
    {"name":"Row","emphasis":"light"},
    {"name":"Dips","emphasis":"light"},
    {"name":"Shoulder","emphasis":null},
    {"name":"Cable row","emphasis":null},
    {"name":"Lateral","emphasis":null},
    {"name":"Bicep DB","emphasis":null}
  ]'::jsonb),
  (6, 'Lower', '[
    {"name":"Pullup","emphasis":"light"},
    {"name":"DB incl","emphasis":"light"},
    {"name":"SL press","emphasis":null},
    {"name":"Leg ext","emphasis":null},
    {"name":"Leg curl","emphasis":null},
    {"name":"Calf","emphasis":null},
    {"name":"Abs","emphasis":null}
  ]'::jsonb),
  (7, null, '[]'::jsonb)
) as d(weekday, label, items)
on conflict (user_id, weekday) do nothing;
