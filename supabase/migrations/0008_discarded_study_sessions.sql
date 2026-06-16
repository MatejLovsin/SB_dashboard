-- Stores sessions the user discarded from the timer so they can be
-- reviewed, recovered into study_sessions, or permanently deleted.

create table public.discarded_study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id       uuid not null references public.subjects (id) on delete cascade,
  exam_id          uuid references public.exams (id) on delete set null,
  started_at       timestamptz not null,
  duration_seconds int not null,
  note             text,
  discarded_at     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

alter table public.discarded_study_sessions enable row level security;
create policy "owner" on public.discarded_study_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
