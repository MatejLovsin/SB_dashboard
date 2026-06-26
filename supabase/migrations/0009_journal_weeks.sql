-- Weekly journal summaries. One row per ISO-ish week (week_start = that week's Monday).
create table public.journal_weeks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start  date not null,            -- Monday of the summarized week (YYYY-MM-DD)
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, week_start)
);
alter table public.journal_weeks enable row level security;
create policy "owner" on public.journal_weeks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
