import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Todo, TodoPin } from '@/lib/db/types';
import { mondayOf } from '@/lib/utils/stats';

type Client = SupabaseClient<Database>;

// --- Key factory ---

export const todoKeys = {
  all: ['todos'] as const,
  byDate: (date: string) => [...todoKeys.all, 'date', date] as const,
  range: (from: string, to: string) => [...todoKeys.all, 'range', from, to] as const,
  pins: () => [...todoKeys.all, 'pins'] as const,
};

// --- Pure UTC helpers ---

/** Current date as YYYY-MM-DD in UTC. */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Tomorrow's date as YYYY-MM-DD in UTC. */
export function tomorrowUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Add (or subtract) `n` days to/from a YYYY-MM-DD string, returning a new YYYY-MM-DD. */
export function addDaysUTC(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Human-readable date label, e.g. "Mon, Jun 29". */
export function dateLabel(date: string): string {
  const d = new Date(date + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

// --- DB queries ---

export async function listTodosByDate(client: Client, date: string): Promise<Todo[]> {
  const { data, error } = await client
    .from('todos')
    .select('*')
    .eq('due_date', date)
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTodosInRange(
  client: Client,
  from: string,
  to: string,
): Promise<Todo[]> {
  const { data, error } = await client
    .from('todos')
    .select('*')
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date', { ascending: true })
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActivePins(client: Client): Promise<TodoPin[]> {
  const { data, error } = await client
    .from('todo_pins')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Idempotent: for each active pin with no existing `todos` row for `date`,
 * insert one materialized todo. Returns nothing.
 */
export async function materializePinsForDate(client: Client, date: string): Promise<void> {
  const pins = await listActivePins(client);
  if (pins.length === 0) return;

  const { data: existing } = await client
    .from('todos')
    .select('pin_id')
    .eq('due_date', date)
    .not('pin_id', 'is', null);

  const existingPinIds = new Set((existing ?? []).map((t) => t.pin_id as string));

  const toInsert = pins
    .filter((p) => !existingPinIds.has(p.id))
    .map((p) => ({
      title: p.title,
      due_date: date,
      position: p.position,
      pin_id: p.id,
    }));

  if (toInsert.length === 0) return;

  const { error } = await client.from('todos').insert(toInsert);
  if (error) throw error;
}

export async function addTodo(
  client: Client,
  input: { title: string; due_date: string; position: number },
): Promise<Todo> {
  const { data, error } = await client
    .from('todos')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Batch-update positions (individual updates in parallel — lists are small). */
export async function updateTodoPositions(
  client: Client,
  updates: { id: string; position: number }[],
): Promise<void> {
  const results = await Promise.all(
    updates.map((u) =>
      client.from('todos').update({ position: u.position }).eq('id', u.id),
    ),
  );
  for (const { error } of results) {
    if (error) throw error;
  }
}

/** Set completed + completed_at (cleared when unchecking). */
export async function setTodoCompleted(
  client: Client,
  id: string,
  completed: boolean,
): Promise<void> {
  const { error } = await client
    .from('todos')
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTodoTitle(
  client: Client,
  id: string,
  title: string,
): Promise<void> {
  const { error } = await client.from('todos').update({ title }).eq('id', id);
  if (error) throw error;
}

export async function deleteTodo(client: Client, id: string): Promise<void> {
  const { error } = await client.from('todos').delete().eq('id', id);
  if (error) throw error;
}

/** Create a `todo_pins` row from the todo, then link the todo to it. */
export async function pinTodo(client: Client, todo: Todo): Promise<void> {
  const { data: pin, error: pinError } = await client
    .from('todo_pins')
    .insert({ title: todo.title, position: todo.position })
    .select('*')
    .single();
  if (pinError) throw pinError;
  const { error } = await client
    .from('todos')
    .update({ pin_id: pin.id })
    .eq('id', todo.id);
  if (error) throw error;
}

/** Delete the `todo_pins` row — FK `on delete set null` clears all instances. */
export async function unpinTodo(client: Client, todo: Todo): Promise<void> {
  if (!todo.pin_id) return;
  const { error } = await client
    .from('todo_pins')
    .delete()
    .eq('id', todo.pin_id);
  if (error) throw error;
}

// --- Stats helpers (pure, operate on Todo[]) ---

export type DayStat = {
  date: string;
  completed: number;
  failed: number;
  total: number;
  /** Fraction 0–1. */
  rate: number;
};

/**
 * For each date with todos where `date < todayDate`, compute completed/failed/total/rate.
 * Returns sorted ascending by date.
 */
export function computeDayStats(todos: Todo[], todayDate: string): DayStat[] {
  const byDate = new Map<string, { completed: number; total: number }>();
  for (const todo of todos) {
    if (todo.due_date >= todayDate) continue;
    const bucket = byDate.get(todo.due_date) ?? { completed: 0, total: 0 };
    bucket.total++;
    if (todo.completed) bucket.completed++;
    byDate.set(todo.due_date, bucket);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { completed, total }]) => ({
      date,
      completed,
      failed: total - completed,
      total,
      rate: total > 0 ? completed / total : 0,
    }));
}

/** Mean 1-based rank of todos matching `predicate`. Returns 0 when no matches. */
function averagePosition(todos: Todo[], predicate: (t: Todo) => boolean): number {
  const filtered = todos.filter(predicate);
  if (filtered.length === 0) return 0;
  return filtered.reduce((acc, t) => acc + (t.position + 1), 0) / filtered.length;
}

/**
 * Average 1-based rank for completed vs failed todos in `pastTodos`.
 * Lower rank = earlier in the list = more important.
 */
export function positionStats(
  pastTodos: Todo[],
): { completedAvgPos: number; failedAvgPos: number } {
  return {
    completedAvgPos: averagePosition(pastTodos, (t) => t.completed),
    failedAvgPos: averagePosition(pastTodos, (t) => !t.completed),
  };
}

/** Group `dayStats` by ISO week (mondayOf), return the last ~8 weeks sorted ascending. */
export function weeklyRollup(
  dayStats: DayStat[],
): { weekStart: string; label: string; rate: number; completed: number; failed: number }[] {
  const buckets = new Map<string, { completed: number; failed: number; total: number }>();
  for (const ds of dayStats) {
    const week = mondayOf(new Date(ds.date + 'T00:00:00Z'));
    const b = buckets.get(week) ?? { completed: 0, failed: 0, total: 0 };
    b.completed += ds.completed;
    b.failed += ds.failed;
    b.total += ds.total;
    buckets.set(week, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([weekStart, { completed, failed, total }]) => {
      const d = new Date(weekStart + 'T00:00:00Z');
      const label = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      return {
        weekStart,
        label,
        rate: total > 0 ? completed / total : 0,
        completed,
        failed,
      };
    });
}

export type ComparisonItem = {
  key: string;
  label: string;
  /** Current value (percentage or rank). */
  current: number;
  /** Previous period value. */
  previous: number;
  /** Percentage change vs previous; null when previous is 0. */
  deltaPct: number | null;
  /** Human-readable sentence. */
  text: string;
};

/**
 * Returns structured comparison lines covering:
 *   1. Latest day vs previous day completion rate.
 *   2. This week vs last week rate.
 *   3. This week vs last week avg rank of completed (lower = more important).
 *
 * Structured fields allow AI formatting later; `text` is human-readable now.
 */
export function buildComparisons(
  dayStats: DayStat[],
  positionStatsByPeriod: {
    thisWeek: { completedAvgPos: number; failedAvgPos: number };
    lastWeek: { completedAvgPos: number; failedAvgPos: number };
  },
): ComparisonItem[] {
  const result: ComparisonItem[] = [];

  // 1. Latest finalized day vs the one before it
  if (dayStats.length >= 2) {
    const cur = dayStats[dayStats.length - 1];
    const prev = dayStats[dayStats.length - 2];
    const curPct = Math.round(cur.rate * 100);
    const prevPct = Math.round(prev.rate * 100);
    const delta =
      prev.rate > 0 ? Math.round(((cur.rate - prev.rate) / prev.rate) * 100) : null;
    const dir = delta !== null ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') : '';
    result.push({
      key: 'today-vs-yesterday',
      label: 'Today vs yesterday',
      current: curPct,
      previous: prevPct,
      deltaPct: delta,
      text: `Completed ${cur.completed}/${cur.total} today vs ${prev.completed}/${prev.total} yesterday${delta !== null ? ` — ${dir} ${Math.abs(delta)}%` : ''}`,
    });
  }

  // 2. This week vs last week completion rate
  const weeks = weeklyRollup(dayStats);
  if (weeks.length >= 2) {
    const cur = weeks[weeks.length - 1];
    const prev = weeks[weeks.length - 2];
    const curPct = Math.round(cur.rate * 100);
    const prevPct = Math.round(prev.rate * 100);
    const delta =
      prev.rate > 0 ? Math.round(((cur.rate - prev.rate) / prev.rate) * 100) : null;
    const dir = delta !== null ? (delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat') : '';
    result.push({
      key: 'week-rate',
      label: 'This week vs last week',
      current: curPct,
      previous: prevPct,
      deltaPct: delta,
      text: `${cur.completed}/${cur.completed + cur.failed} this week (${curPct}%) vs ${prev.completed}/${prev.completed + prev.failed} last week (${prevPct}%)${delta !== null ? ` — ${dir} ${Math.abs(delta)}%` : ''}`,
    });
  }

  // 3. This week vs last week avg rank of completed (lower = more important)
  const thisAvg = positionStatsByPeriod.thisWeek.completedAvgPos;
  const lastAvg = positionStatsByPeriod.lastWeek.completedAvgPos;
  if (thisAvg > 0 && lastAvg > 0) {
    const delta = Math.round(((thisAvg - lastAvg) / lastAvg) * 100);
    const insight =
      delta < 0
        ? ' — completing more important tasks'
        : delta > 0
          ? ' — completing less important tasks'
          : '';
    result.push({
      key: 'completed-rank',
      label: 'Avg rank of completed (this week vs last)',
      current: Math.round(thisAvg * 10) / 10,
      previous: Math.round(lastAvg * 10) / 10,
      deltaPct: delta,
      text: `Avg rank of completed: ${thisAvg.toFixed(1)} this week vs ${lastAvg.toFixed(1)} last week (lower = more important)${insight}`,
    });
  }

  return result;
}

// --- Server-side aggregate for the home dashboard ---

export async function getTodoHomeState(
  client: Client,
  today: string,
): Promise<{ today: Todo[]; doneCount: number; totalCount: number }> {
  const todos = await listTodosByDate(client, today);
  const doneCount = todos.filter((t) => t.completed).length;
  return { today: todos, doneCount, totalCount: todos.length };
}
