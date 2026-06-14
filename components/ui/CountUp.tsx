'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from '@/lib/hooks/useInView';

interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: 'plain' | 'compact';
}

function fmt(v: number, decimals?: number, format?: 'plain' | 'compact'): string {
  if (format === 'compact') {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(decimals ?? 1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(decimals ?? 1)}K`;
    return v.toFixed(decimals ?? 0);
  }
  return v.toFixed(decimals ?? 0);
}

/** Animates a number from 0 → value when it enters the viewport. */
export function CountUp({ value, decimals, prefix = '', suffix = '', format }: CountUpProps) {
  const [ref, inView] = useInView();
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    startRef.current = null;
    const duration = 900;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 5); // ease-out-quint
      setDisplay(eased * value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [inView, value]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>}>
      {prefix}{fmt(display, decimals, format)}{suffix}
    </span>
  );
}
