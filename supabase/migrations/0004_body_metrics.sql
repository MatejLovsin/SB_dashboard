create table body_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recorded_at date not null default current_date,
  weight_kg   numeric(6,2) not null,
  bodyfat_pct numeric(5,2),
  created_at  timestamptz not null default now()
);

alter table body_metrics enable row level security;

create policy "owner only" on body_metrics
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index on body_metrics (user_id, recorded_at desc);
