'use client';

import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { ImageLightbox } from '@/components/ui/ImageLightbox';

// An idea's image in its reading view: always whole, fitted to the panel's
// height on desktop (beside the notes) and to under half the screen on the
// phone (above them). A tap opens it full-screen to zoom into.
export function IdeaPlate({ src }: { src: string }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className="md:sticky md:top-0 md:self-start">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open image full screen"
        className="idea-plate group relative flex w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="max-h-[45vh] w-auto max-w-full object-contain md:max-h-[calc(92vh-10rem)]"
        />
        <span className="label absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-muted opacity-70 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" /> Expand
        </span>
      </button>
      <ImageLightbox src={src} open={open} onClose={() => setOpen(false)} />
    </figure>
  );
}
