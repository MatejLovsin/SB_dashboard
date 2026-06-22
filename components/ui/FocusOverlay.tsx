'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useMountTransition } from '@/lib/hooks/useMountTransition';

interface FocusOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Title shown in the top rail, inline with the action/close buttons. */
  title?: ReactNode;
  /** Optional label for the dialog (accessibility). Falls back to a string title. */
  label?: string;
  /** Optional node rendered top-right of the panel header rail (e.g. Edit button). */
  action?: ReactNode;
}

/**
 * Full-screen focal overlay — Instagram-style. Dims + blurs everything behind,
 * floats a single panel to the centre of the screen with a scale/fade entrance,
 * and stays the sole focal point until dismissed (backdrop click, Escape, or the
 * close button). Read-only content lives in `children`.
 */
export function FocusOverlay({ open, onClose, children, title, label, action }: FocusOverlayProps) {
  const { mounted, entered } = useMountTransition(open, 480);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!mounted) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [mounted, onClose]);

  // Move focus into the panel once it's mounted.
  useEffect(() => {
    if (entered) panelRef.current?.focus();
  }, [entered]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={label ?? (typeof title === 'string' ? title : undefined)}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm transition-opacity"
        style={{
          opacity: entered ? 1 : 0,
          transitionDuration: 'var(--dur-mid)',
          transitionTimingFunction: 'var(--ease-out-quint)',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="panel relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-3xl outline-none"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
          transition:
            'opacity var(--dur-mid) var(--ease-out-quint), transform var(--dur-mid) var(--ease-out-quint)',
        }}
      >
        {/* Header rail — title sits inline with the action/close buttons, top-aligned
            so a long title wraps (up to 3 lines) without shoving the controls down. */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <h2 className="min-w-0 flex-1 break-words pt-0.5 text-xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] line-clamp-3">
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-1">
            {action}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="no-scrollbar overflow-y-auto px-6 pb-7 pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
