-- Boards: one whiteboard per project. Ideas are nodes placed freely on a canvas,
-- lines between them only ever mean "related", and a board can optionally be cut
-- into phases -- labelled regions that hold nodes.
--
-- Positions are stored in canvas units (React Flow's coordinate space). A node
-- that sits inside a phase stores its position RELATIVE to that phase, which is
-- how React Flow models a parent -- dragging the phase then carries its nodes
-- along without rewriting every child row.
--
-- A node or a phase can point at a goal. The board never writes to the goal: it
-- reads the goal's resolved progress (lib/queries/goals.ts) and lights up when
-- the goal is done, so the "is it finished" rule lives in exactly one place.
-- `done` is the manual alternative for steps that are not worth a goal.

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,

  name        text not null,
  description text,
  -- Which pages list this board at their foot. Plain text rather than an enum
  -- array so a new page needs no migration; the check keeps typos out.
  pages       text[] not null default '{}',
  -- The last camera position, so a board reopens where you left it.
  viewport    jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint boards_pages_known
    check (pages <@ array['home', 'fitness', 'school', 'work', 'goals']::text[])
);

create table public.board_phases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id    uuid not null references public.boards (id) on delete cascade,

  title       text not null,
  x           double precision not null default 0,
  y           double precision not null default 0,
  width       double precision not null default 480,
  height      double precision not null default 320,

  done        boolean not null default false,
  goal_id     uuid references public.goals (id) on delete set null,

  created_at  timestamptz not null default now()
);

create table public.board_nodes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id    uuid not null references public.boards (id) on delete cascade,
  -- Deleting a phase releases its nodes rather than taking them with it. The UI
  -- converts them back to absolute positions first.
  phase_id    uuid references public.board_phases (id) on delete set null,

  title       text not null,
  -- Markdown source, rendered through components/ui/Markdown.
  body        text,
  x           double precision not null default 0,
  y           double precision not null default 0,
  -- Quick thoughts added from the phone land here, off the canvas, until they
  -- are dragged into place on desktop.
  unsorted    boolean not null default false,

  done        boolean not null default false,
  goal_id     uuid references public.goals (id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.board_edges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id    uuid not null references public.boards (id) on delete cascade,

  source_id   uuid not null references public.board_nodes (id) on delete cascade,
  target_id   uuid not null references public.board_nodes (id) on delete cascade,
  label       text,

  created_at  timestamptz not null default now(),

  constraint board_edges_not_self check (source_id <> target_id)
);

create index boards_user_updated_idx   on public.boards (user_id, updated_at desc);
create index board_phases_board_idx    on public.board_phases (board_id);
create index board_nodes_board_idx     on public.board_nodes (board_id);
create index board_edges_board_idx     on public.board_edges (board_id);
create index board_nodes_goal_idx      on public.board_nodes (goal_id) where goal_id is not null;
create index board_phases_goal_idx     on public.board_phases (goal_id) where goal_id is not null;

create trigger boards_set_updated_at
  before update on public.boards
  for each row execute function public.set_updated_at();

create trigger board_nodes_set_updated_at
  before update on public.board_nodes
  for each row execute function public.set_updated_at();

-- Editing anything on a board counts as editing the board, so the list on
-- /boards can put the one you last worked on first.
create or replace function public.touch_board()
returns trigger
language plpgsql
as $$
begin
  update public.boards
     set updated_at = now()
   where id = coalesce(new.board_id, old.board_id);
  return null;
end;
$$;

create trigger board_nodes_touch_board
  after insert or update or delete on public.board_nodes
  for each row execute function public.touch_board();

create trigger board_edges_touch_board
  after insert or update or delete on public.board_edges
  for each row execute function public.touch_board();

create trigger board_phases_touch_board
  after insert or update or delete on public.board_phases
  for each row execute function public.touch_board();

alter table public.boards        enable row level security;
alter table public.board_phases  enable row level security;
alter table public.board_nodes   enable row level security;
alter table public.board_edges   enable row level security;

create policy "owner" on public.boards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner" on public.board_phases
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner" on public.board_nodes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner" on public.board_edges
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
