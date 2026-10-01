'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, Scan, X } from 'lucide-react';
import { useMountTransition } from '@/lib/hooks/useMountTransition';
import { useZoomPan } from '@/lib/hooks/useZoomPan';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

/**
 * One image, the whole screen, nothing else lit. Fitted on open; wheel, pinch
 * or a tap zooms, a drag pans. It sits above a FocusOverlay, so it takes Escape
 * for itself rather than closing both.
 */
export function ImageLightbox({ src, alt = '', open, onClose }: ImageLightboxProps) {
  const { mounted, entered } = useMountTransition(open, 300);
  const onClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted || !onClient) return null;
  return createPortal(
    <Stage key={src} src={src} alt={alt} entered={entered} onClose={onClose} />,
    document.body,
  );
}

function Stage({
  src,
  alt,
  entered,
  onClose,
}: Omit<ImageLightboxProps, 'open'> & { entered: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { view, animate, handlers, zoomBy, reset } = useZoomPan(stageRef, imgRef, onClose);

  // Capture phase on window runs before the overlay's document listener.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const fade = {
    opacity: entered ? 1 : 0,
    transition: 'opacity var(--dur-mid) var(--ease-out-quint)',
  };
  const zoomed = view.scale > 1;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Image">
      <div className="absolute inset-0 bg-black/90" style={fade} aria-hidden />
      <div
        ref={stageRef}
        {...handlers}
        className={`absolute inset-0 flex touch-none select-none items-center justify-center overflow-hidden ${
          zoomed ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        style={fade}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          className={`max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-2rem)] object-contain ${
            zoomed ? '' : 'cursor-zoom-in'
          }`}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transition: animate ? 'transform var(--dur-mid) var(--ease-out-quint)' : 'none',
          }}
        />
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="floating-panel absolute right-4 top-4 rounded-full p-2 text-muted transition-colors hover:text-foreground"
        style={fade}
      >
        <X className="h-4 w-4" />
      </button>

      <div
        className="floating-panel absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-1.5 py-1"
        style={fade}
      >
        <RailButton label="Zoom out" onClick={() => zoomBy(1 / 1.5)} disabled={!zoomed}>
          <Minus className="h-4 w-4" />
        </RailButton>
        <span className="label nums w-14 text-center text-[11px] text-muted">
          {Math.round(view.scale * 100)}%
        </span>
        <RailButton label="Zoom in" onClick={() => zoomBy(1.5)} disabled={view.scale >= 8}>
          <Plus className="h-4 w-4" />
        </RailButton>
        <RailButton label="Fit to screen" onClick={reset} disabled={!zoomed}>
          <Scan className="h-4 w-4" />
        </RailButton>
      </div>
    </div>
  );
}

function RailButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full p-2 text-muted transition-colors hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

const noopSubscribe = () => () => {};
