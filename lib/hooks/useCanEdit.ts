'use client';

import { useSyncExternalStore } from 'react';

// Boards are edited with a mouse on a wide screen. Phones and tablets get the
// read-only view: dragging nodes and drawing lines with a thumb is miserable.
const QUERY = '(min-width: 768px) and (pointer: fine)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** True on a desktop-class device. False on the server, so SSR renders read-only. */
export function useCanEdit(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
