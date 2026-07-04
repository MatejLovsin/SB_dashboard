-- Work boards: user-named groupings of roadmap cards, so unrelated projects
-- don't all crowd into one kanban. A "Main" board is seeded per existing user
-- so pre-existing cards keep exactly the view they had before this migration.

create table public.work_boards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.work_boards enable row level security;

create policy "owner" on public.work_boards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.work_boards (user_id, name, position)
select id, 'Main', 0 from auth.users;

alter table public.roadmap_cards add column board_id uuid references public.work_boards (id) on delete cascade;

update public.roadmap_cards rc
set board_id = wb.id
from public.work_boards wb
where wb.user_id = rc.user_id and wb.name = 'Main';

alter table public.roadmap_cards alter column board_id set not null;

create index roadmap_cards_board_idx on public.roadmap_cards (user_id, board_id, status, position);
