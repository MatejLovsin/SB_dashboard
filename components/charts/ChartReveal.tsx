'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/lib/hooks/useInView';

interface ChartRevealProps {
  children: ReactNode;
  /** Must match the chart's height prop to prevent layout shift. */
  height: number;
}

/**
 * Defers mounting its child chart until it enters the viewport.
 * Because Recharts animates on mount, this makes the chart draw in on scroll.
 */
export function ChartReveal({ children, height }: ChartRevealProps) {
  const [ref, inView] = useInView({ threshold: 0.1 });
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} style={{ minHeight: height }}>
      {inView ? children : <div style={{ height }} />}
    </div>
  );
}
