'use client';

import { useCallback, useRef } from 'react';
import type { Viewport } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { updateBoard } from '@/lib/queries/boards';

interface CanvasHintProps {
  canEdit: boolean;
  error: string | null;
  onAddIdea: () => void;
  onAddPhase: () => void;
}

/** The line above the canvas: how to use it, or what just failed to save. */
export function CanvasHint({ canEdit, error, onAddIdea, onAddPhase }: CanvasHintProps) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <p className={`label text-[10px] ${error ? 'text-down' : 'text-muted'}`}>
        {error ??
          (canEdit
            ? 'Double-click to add · drag from a light to connect · drop an idea in a phase to group it'
            : 'Viewing · tap an idea to read it · edit on a computer')}
      </p>
      {canEdit ? (
        <div className="flex flex-none gap-2">
          <Button size="sm" variant="ghost" onClick={onAddPhase}>
            <Plus className="h-4 w-4" />
            Phase
          </Button>
          <Button size="sm" variant="secondary" onClick={onAddIdea}>
            <Plus className="h-4 w-4" />
            Idea
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Remembers where the camera was, so a board reopens where you left it. */
export function useViewportSaver(boardId: string, canEdit: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (_event: MouseEvent | TouchEvent | null, viewport: Viewport) => {
      // The phone only looks; it should not move the desktop's camera.
      if (!canEdit) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const { x, y, zoom } = viewport;
        updateBoard(createClient(), boardId, { viewport: { x, y, zoom } }).catch(console.error);
      }, 800);
    },
    [boardId, canEdit],
  );
}
