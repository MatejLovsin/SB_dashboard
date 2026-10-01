'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { FocusOverlay } from '@/components/ui/FocusOverlay';
import { createClient } from '@/lib/supabase/client';
import { removeBoardImages } from '@/lib/queries/boardImages';
import {
  deleteBoard,
  updateBoard,
  type BoardContents,
  type BoardInput,
} from '@/lib/queries/boards';
import type { BoardGoals } from './boardContext';
import { BoardCanvas } from './BoardCanvas';
import { BoardForm } from './BoardForm';

interface BoardEditorProps {
  contents: BoardContents;
  goals: Promise<BoardGoals>;
  images: Record<string, string>;
}

export function BoardEditor({ contents, goals, images }: BoardEditorProps) {
  const router = useRouter();
  const { board } = contents;
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  async function save(input: BoardInput) {
    setPending(true);
    try {
      await updateBoard(createClient(), board.id, input);
      setEditing(false);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    try {
      const client = createClient();
      // Rows cascade with the board; files in storage do not. Best effort.
      await removeBoardImages(client, board.id).catch(console.error);
      await deleteBoard(client, board.id);
      router.push('/boards');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/boards"
            className="label mb-2 inline-flex items-center gap-1.5 text-[10px] text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-3 w-3" />
            Boards
          </Link>
          <h1 className="truncate text-xl font-bold md:text-2xl">{board.name}</h1>
          {board.description ? (
            <p className="mt-1.5 text-sm text-muted">{board.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Board settings"
          className="rounded-full p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      <ReactFlowProvider>
        <BoardCanvas contents={contents} goals={goals} images={images} />
      </ReactFlowProvider>

      <FocusOverlay open={editing} onClose={() => setEditing(false)} title="Board">
        <BoardForm
          board={board}
          onSubmit={save}
          onCancel={() => setEditing(false)}
          onDelete={remove}
          isPending={pending}
        />
      </FocusOverlay>
    </div>
  );
}
