'use client';

import { useEffect, useRef, useState } from 'react';

export function useInView(
  options?: { threshold?: number; once?: boolean },
): [React.RefObject<Element | null>, boolean] {
  const { threshold = 0.2, once = true } = options ?? {};
  const ref = useRef<Element>(null);
  // SSR fallback: if IntersectionObserver is unavailable, start as visible.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return [ref, inView];
}
