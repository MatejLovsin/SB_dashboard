create table if not exists work_metrics (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid(),
  date        date        not null,
  value       numeric     not null check (value >= 0 and value <= 10),
  label       text        not null default 'focus score',
  created_at  timestamptz not null default now(),
  constraint work_metrics_user_date_label_key unique (user_id, date, label)
);

alter table work_metrics enable row level security;

create policy "owner" on work_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
