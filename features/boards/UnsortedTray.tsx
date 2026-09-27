'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { BoardNode } from '@/lib/db/types';
import { Button } from '@/components/ui/Button';
import { markdownExcerpt } from '@/lib/utils/markdown';

interface UnsortedTrayProps {
  items: BoardNode[];
  onPlace: (id: string) => void;
  onDiscard: (id: string) => void;
  onClose: () => void;
}

// A small floating list over the canvas (desktop): the thoughts that arrived
// from the phone, oldest first, each waiting to be placed.
export function UnsortedTray({ items, onPlace, onDiscard, onClose }: UnsortedTrayProps) {
  return (
    <div className="floating-panel absolute left-3 top-3 z-10 flex max-h-[70%] w-72 flex-col rounded-2xl">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="label text-[10px] text-muted">Unsorted · {items.length}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close unsorted"
          className="rounded-full p-1 text-muted transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="overflow-y-auto px-2 pb-2">
        {items.map((item) => (
          <TrayRow key={item.id} item={item} onPlace={onPlace} onDiscard={onDiscard} />
        ))}
      </ul>
    </div>
  );
}

function TrayRow({
  item,
  onPlace,
  onDiscard,
}: {
  item: BoardNode;
  onPlace: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const excerpt = markdownExcerpt(item.body);

  return (
    <li className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-border/40">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.title}</div>
        {excerpt ? <p className="truncate text-xs text-muted">{excerpt}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => (confirming ? onDiscard(item.id) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        aria-label={confirming ? 'Delete for good' : 'Delete thought'}
        className={`rounded-full p-1.5 transition-colors ${
          confirming ? 'text-down' : 'text-muted hover:text-foreground'
        }`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <Button size="sm" variant="secondary" onClick={() => onPlace(item.id)}>
        Place
      </Button>
    </li>
  );
}
