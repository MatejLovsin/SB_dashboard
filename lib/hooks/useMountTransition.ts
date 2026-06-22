'use client';

import { useEffect, useState } from 'react';

/**
 * Drives mount/enter/exit animation without an animation library.
 *
 * - `mounted` — whether the element should be in the DOM at all.
 * - `entered` — whether it should be in its "visible" (animated-in) state.
 *
 * When `open` flips true: mount immediately, then flip `entered` on the next
 * frame so a CSS transition runs from the hidden → visible state. When `open`
 * flips false: drop `entered` (animate out), then unmount after `duration`.
 */
export function useMountTransition(open: boolean, duration = 480): {
  mounted: boolean;
  entered: boolean;
} {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Next frame: let the hidden state paint, then transition to visible.
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf);
    }

    setEntered(false);
    const t = setTimeout(() => setMounted(false), duration);
    return () => clearTimeout(t);
  }, [open, duration]);

  return { mounted, entered };
}
