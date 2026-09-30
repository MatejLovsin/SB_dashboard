'use client';
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export interface PopupPosition {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const GAP = 4;
const MAX_HEIGHT = 256;

// Place the list under the trigger, or above it when there is clearly more room
// there. Fixed positioning, so an overlay's scrolling body cannot clip it.
function measure(trigger: HTMLElement): PopupPosition {
  const r = trigger.getBoundingClientRect();
  const below = window.innerHeight - r.bottom - GAP * 2;
  const above = r.top - GAP * 2;
  const flip = below < 160 && above > below;
  return flip
    ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + GAP, maxHeight: Math.min(MAX_HEIGHT, above) }
    : { left: r.left, width: r.width, top: r.bottom + GAP, maxHeight: Math.min(MAX_HEIGHT, below) };
}

/**
 * The plumbing behind `Select`'s open list: keeps it pinned to the trigger
 * through scroll and resize, closes it on an outside press, and swallows Escape
 * before a surrounding `FocusOverlay` sees it — Escape closes the list, not the
 * dialog it sits in.
 */
export function useSelectPopup(
  open: boolean,
  close: () => void,
  triggerRef: RefObject<HTMLElement | null>,
  listRef: RefObject<HTMLElement | null>,
): PopupPosition | null {
  const [pos, setPos] = useState<PopupPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const update = () => setPos(measure(trigger));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      close();
    }
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, close, triggerRef, listRef]);

  return open ? pos : null;
}
