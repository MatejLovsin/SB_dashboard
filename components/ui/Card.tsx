import type { HTMLAttributes } from 'react';

// A "card" no longer draws a card. `panel` supplies the hairline top rule and
// nothing else — see the DESIGN LANGUAGE block in app/globals.css. The rule
// spans the full width; the padding insets the content under it.
export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`panel rounded-xl px-4 pb-5 pt-4 ${className}`}
      {...props}
    />
  );
}

// Panel titles are micro-labels, not display type — they read as the caption
// above the data, so they take the label face rather than the wide display one.
export function CardTitle({ className = '', ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`label text-[11px] font-medium text-muted ${className}`}
      {...props}
    />
  );
}
