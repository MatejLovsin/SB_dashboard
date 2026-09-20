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
  /**
   * `default` — the compact panel used for detail read-outs and short forms.
   * `reading` — the long-form surface: a wider panel, more air, and room for the
   * full reading measure. Use it wherever <Markdown> renders an entry.
   */
  size?: 'default' | 'reading';
}

const sizeClasses = {
  default: { panel: 'max-w-lg max-h-[85vh]', pad: 'px-6', head: 'pt-6', body: 'pb-7 pt-4' },
  reading: {
    panel: 'max-w-2xl max-h-[90vh]',
    pad: 'px-5 sm:px-9',
    head: 'pt-6 sm:pt-8',
    body: 'pb-9 pt-5',
  },
} as const;

/**
 * Full-screen focal overlay — Instagram-style. Dims + blurs everything behind,
 * floats a single panel to the centre of the screen with a scale/fade entrance,
 * and stays the sole focal point until dismissed (backdrop click, Escape, or the
 * close button). Read-only content lives in `children`.
 *
 * The panel uses `.floating-panel`, not `.panel` — the opaque fill reserved for
 * surfaces drawn over live content, because the dimmed page behind it would
 * otherwise read straight through the text. See the note in `globals.css`.
 */
export function FocusOverlay({
  open,
  onClose,
  children,
  title,
  label,
  action,
  size = 'default',
}: FocusOverlayProps) {
  const s = sizeClasses[size];
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
        className={`floating-panel relative z-10 flex w-full flex-col rounded-3xl outline-none ${s.panel}`}
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
          transition:
            'opacity var(--dur-mid) var(--ease-out-quint), transform var(--dur-mid) var(--ease-out-quint)',
        }}
      >
        {/* Header rail — title sits inline with the action/close buttons, top-aligned
            so a long title wraps (up to 3 lines) without shoving the controls down. */}
        <div className={`flex items-start justify-between gap-3 ${s.pad} ${s.head}`}>
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
        <div className={`no-scrollbar overflow-y-auto ${s.pad} ${s.body}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
