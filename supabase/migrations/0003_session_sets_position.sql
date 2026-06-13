-- Global set ordering for the live workout logger.
--
-- When a session is seeded from a plan, all its session_sets are inserted in one
-- statement and therefore share a single created_at (now() is transaction-time),
-- so created_at can't order them. Add an explicit position — a 0-based index
-- across every set in a session, in workout order — so exercise groups and the
-- sets within them keep plan order when a session is reloaded/resumed.
--
-- set_number stays the 1-based number within an exercise (kept for history).
-- Run this in the Supabase SQL editor after 0002_plan_sets.sql.

alter table public.session_sets
  add column if not exists position int not null default 0;

create index if not exists session_sets_session_position_idx
  on public.session_sets (session_id, position);
