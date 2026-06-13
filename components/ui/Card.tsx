import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`panel rounded-2xl p-5 ${className}`}
      {...props}
    />
  );
}

export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`text-sm font-semibold text-muted uppercase tracking-wide ${className}`}
      {...props}
    />
  );
}
