'use client';

import { useState } from 'react';
import type { Board, BoardPage } from '@/lib/db/types';
import { BOARD_PAGES, PAGE_LABEL, type BoardInput } from '@/lib/queries/boards';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface BoardFormProps {
  board?: Board;
  onSubmit: (input: BoardInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isPending?: boolean;
}

// Name, a one-line description, and which pages list the board at their foot.
export function BoardForm({ board, onSubmit, onCancel, onDelete, isPending }: BoardFormProps) {
  const [name, setName] = useState(board?.name ?? '');
  const [description, setDescription] = useState(board?.description ?? '');
  const [pages, setPages] = useState<BoardPage[]>(board?.pages ?? []);
  const [confirming, setConfirming] = useState(false);

  const toggle = (page: BoardPage) =>
    setPages((prev) => (prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() || null, pages });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Name"
        id="board-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Freelance plan, thesis, cut to 80 kg…"
        required
        autoFocus
      />
      <Input
        label="Description (optional)"
        id="board-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What this board is working towards"
      />

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium">Show at the foot of</legend>
        <div className="flex flex-wrap gap-2">
          {BOARD_PAGES.map((page) => {
            const on = pages.includes(page);
            return (
              <button
                key={page}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(page)}
                className={`label rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  on
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {PAGE_LABEL[page]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending ? 'Saving…' : board ? 'Save' : 'Create board'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {onDelete ? (
          <Button
            type="button"
            variant="danger"
            className="ml-auto"
            onClick={() => (confirming ? onDelete() : setConfirming(true))}
          >
            {confirming ? 'Delete for good?' : 'Delete board'}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
