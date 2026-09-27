'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { ImageChange } from './useIdeaImages';

interface ImageFieldProps {
  /** The idea's saved image, signed. */
  currentUrl: string | undefined;
  change: ImageChange;
  onChange: (change: ImageChange) => void;
}

// One picture per idea. Picking (or pasting — the form listens for that) only
// stages it; the upload happens when the idea is saved.
export function ImageField({ currentUrl, change, onChange }: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const staged = change?.kind === 'set' ? change.file : null;
  const stagedUrl = useMemo(() => (staged ? URL.createObjectURL(staged) : null), [staged]);
  useEffect(() => () => (stagedUrl ? URL.revokeObjectURL(stagedUrl) : undefined), [stagedUrl]);

  const shown = change?.kind === 'remove' ? undefined : (stagedUrl ?? currentUrl);

  return (
    <div>
      <span className="label mb-1.5 block text-[10px] text-muted">Image</span>
      {shown ? (
        <div className="relative inline-block">
          {/* Signed or local object URLs: next/image would need a remote pattern per signature. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown} alt="" className="max-h-56 max-w-full rounded-xl" />
          <button
            type="button"
            onClick={() => onChange(currentUrl && !staged ? { kind: 'remove' } : null)}
            aria-label="Remove image"
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted backdrop-blur transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className={`flex items-center gap-3 ${shown ? 'mt-2' : ''}`}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ImagePlus className="h-4 w-4" />
          {shown ? 'Replace' : 'Add image'}
        </button>
        <span className="text-xs text-muted">or paste one</span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ kind: 'set', file });
          e.target.value = '';
        }}
      />
    </div>
  );
}

/** The first image on a paste event, if any — for the form's onPaste. */
export function pastedImage(e: React.ClipboardEvent): File | null {
  for (const item of e.clipboardData.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
  }
  return null;
}
