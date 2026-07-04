-- Cardio logging: separate from weightlifting sessions. A cardio session holds one or
-- more entries (one per machine/activity), each scored on a universal 1-10 RPE
-- (perceived exertion) scale so intensity is comparable across machines that expose
-- different stats (treadmill incline+speed vs. stairmaster speed-only vs. an outdoor
-- hike with no machine stats at all).

create table public.cardio_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  performed_at timestamptz not null default now(),
  notes        text,
  created_at   timestamptz not null default now()
);
create index cardio_sessions_performed_at_idx on public.cardio_sessions (user_id, performed_at desc);
alter table public.cardio_sessions enable row level security;
create policy "owner" on public.cardio_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.cardio_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id       uuid not null references public.cardio_sessions (id) on delete cascade,
  activity         text not null,                        -- free-typed: "Treadmill", "Stairmaster", "Hike"...
  position         int not null default 0,
  duration_minutes numeric(6, 1) not null,
  intensity        smallint not null check (intensity between 1 and 10), -- RPE, universal across activities
  distance_km      numeric(6, 2),                         -- optional; blank for machines with no distance
  notes            text,
  created_at       timestamptz not null default now()
);
create index cardio_entries_session_idx on public.cardio_entries (session_id, position);
alter table public.cardio_entries enable row level security;
create policy "owner" on public.cardio_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
