'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Pin, ClipboardList } from 'lucide-react';
import {
  todoKeys,
  todayUTC,
  tomorrowUTC,
  dateLabel,
  listTodosByDate,
  setTodoCompleted,
} from '@/lib/queries/todos';
import type { Todo } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export function TodoDashboard() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const todayStr = useMemo(() => todayUTC(), []);
  const tomorrowStr = useMemo(() => tomorrowUTC(), []);

  const { data: todos = [], isLoading } = useQuery({
    queryKey: todoKeys.byDate(todayStr),
    queryFn: () => listTodosByDate(supabase, todayStr).catch(() => []),
  });

  const doneCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      setTodoCompleted(supabase, id, completed),
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.byDate(todayStr) });
      const previous = queryClient.getQueryData<Todo[]>(todoKeys.byDate(todayStr));
      queryClient.setQueryData<Todo[]>(
        todoKeys.byDate(todayStr),
        (old) => old?.map((t) => (t.id === id ? { ...t, completed } : t)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(todoKeys.byDate(todayStr), ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.byDate(todayStr) });
    },
  });

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: today's to-do list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted" />
              <span className="text-sm font-semibold">Today</span>
            </div>
            {totalCount > 0 && (
              <span className="text-xs tabular-nums text-muted">
                {doneCount}/{totalCount}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner className="h-5 w-5" />
            </div>
          ) : todos.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing planned for today — plan tomorrow&apos;s list.
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
              {todos.map((todo) => (
                <button
                  key={todo.id}
                  onClick={() =>
                    toggleMutation.mutate({ id: todo.id, completed: !todo.completed })
                  }
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface)] press-flash"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  )}
                  <span
                    className={`flex-1 text-sm ${
                      todo.completed ? 'text-muted line-through' : ''
                    }`}
                  >
                    {todo.title}
                  </span>
                  {todo.pin_id && (
                    <Pin className="mt-0.5 h-3 w-3 shrink-0 text-muted" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: quick-action link cards */}
        <div className="space-y-2">
          <Link
            href="/todos/plan"
            className="block rounded-xl border border-border bg-[var(--surface)] p-3 transition-colors hover:border-accent/30"
          >
            <p className="text-sm font-semibold">Plan tomorrow</p>
            <p className="mt-0.5 text-xs text-muted">{dateLabel(tomorrowStr)}</p>
          </Link>
          <Link
            href="/todos"
            className="block rounded-xl border border-border bg-[var(--surface)] p-3 transition-colors hover:border-accent/30"
          >
            <p className="text-sm font-semibold">Review performance</p>
            <p className="mt-0.5 text-xs text-muted">See your completion history</p>
          </Link>
        </div>
      </div>
    </Card>
  );
}
