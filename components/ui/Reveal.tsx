'use client';

import type { ReactNode } from 'react';
import { useInView } from '@/lib/hooks/useInView';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/** Fades + slides children in when they enter the viewport. */
export function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(10px)',
        transition: `opacity var(--dur-mid) var(--ease-out-quint) ${delay}ms, transform var(--dur-mid) var(--ease-out-quint) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
