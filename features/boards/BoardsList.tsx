'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Plus, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCanEdit } from '@/lib/hooks/useCanEdit';
import { createClient } from '@/lib/supabase/client';
import {
  createBoard,
  createNode,
  PAGE_LABEL,
  type BoardInput,
  type BoardSummary,
} from '@/lib/queries/boards';
import { BoardForm } from './BoardForm';
import { ThoughtForm } from './ThoughtForm';

export function BoardsList({ boards }: { boards: BoardSummary[] }) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [creating, setCreating] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(input: BoardInput) {
    setPending(true);
    setError(null);
    try {
      const board = await createBoard(createClient(), input);
      router.push(`/boards/${board.id}`);
    } catch (e) {
      console.error(e);
      setError('Could not create the board.');
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Boards"
        description="One canvas per project — ideas, how they connect, and how far along they are."
        action={
          <div className="flex gap-2">
            {!canEdit && boards.length > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                className="whitespace-nowrap"
                onClick={() => setThinking(true)}
              >
                <Plus className="h-4 w-4" />
                Thought
              </Button>
            ) : null}
            <Button size="sm" className="whitespace-nowrap" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {/* Beside "+ Thought" on a phone, the short label keeps it on one line. */}
              <span className="sm:hidden">Board</span>
              <span className="hidden sm:inline">New board</span>
            </Button>
          </div>
        }
      />

      {boards.length === 0 ? (
        <EmptyState
          icon={Waypoints}
          title="No boards yet"
          description="Start one for a project, drop your ideas on it, and draw the lines between them."
        />
      ) : (
        <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
          {boards.map((summary) => (
            <BoardRow key={summary.board.id} summary={summary} />
          ))}
        </div>
      )}

      <FocusOverlay open={creating} onClose={() => setCreating(false)} title="New board">
        <BoardForm onSubmit={create} onCancel={() => setCreating(false)} isPending={pending} />
        {error ? <p className="mt-3 text-sm text-down">{error}</p> : null}
      </FocusOverlay>

      <QuickThought boards={boards} open={thinking} onClose={() => setThinking(false)} />
    </>
  );
}

// Quick-add from the phone without opening a board. Boards come most recently
// edited first, so the picker defaults to the one you were last working on.
function QuickThought({
  boards,
  open,
  onClose,
}: {
  boards: BoardSummary[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const close = () => {
    onClose();
    router.refresh(); // the rows' unsorted counts
  };

  async function add(boardId: string | null, thought: { title: string; body: string | null }) {
    if (!boardId) return false;
    try {
      await createNode(createClient(), { board_id: boardId, ...thought, unsorted: true });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  return (
    <FocusOverlay open={open} onClose={close} title="New thought">
      <ThoughtForm
        boards={boards.map(({ board }) => ({ id: board.id, name: board.name }))}
        onAdd={add}
        onCancel={close}
      />
    </FocusOverlay>
  );
}

export function BoardRow({ summary }: { summary: BoardSummary }) {
  const { board, nodes, done, unsorted } = summary;
  return (
    <Link href={`/boards/${board.id}`} className="block">
      <div className="panel panel-hover press-flash flex items-center gap-4 rounded-xl px-4 py-4">
        <div className="min-w-0 flex-1">
          <div className="display truncate text-sm font-bold">{board.name}</div>
          {board.description ? (
            <p className="mt-1 truncate text-sm text-muted">{board.description}</p>
          ) : null}
          <div className="label mt-2 flex flex-wrap gap-x-3 text-[10px] text-muted">
            <span className="nums">
              {nodes} {nodes === 1 ? 'idea' : 'ideas'}
              {done > 0 ? ` · ${done} done` : ''}
            </span>
            {unsorted > 0 ? <span className="nums text-accent">{unsorted} unsorted</span> : null}
            {board.pages.map((p) => (
              <span key={p}>{PAGE_LABEL[p]}</span>
            ))}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </div>
    </Link>
  );
}
