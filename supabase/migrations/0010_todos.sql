-- Daily to-do pins (non-negotiable templates that auto-materialize each day).
create table public.todo_pins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.todo_pins enable row level security;
create policy "owner" on public.todo_pins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Daily to-do items (one-offs + materialized pins per due_date).
create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null,
  due_date     date not null,
  position     int not null default 0,
  completed    boolean not null default false,
  completed_at timestamptz,
  pin_id       uuid references public.todo_pins (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index on public.todos (user_id, due_date);
alter table public.todos enable row level security;
create policy "owner" on public.todos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
