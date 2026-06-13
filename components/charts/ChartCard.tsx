import type { ReactNode } from 'react';

interface ChartCardProps {
  /** Card title (small uppercase, matches StatTile labels). */
  title: string;
  /** Optional value/summary shown large under the title. */
  value?: ReactNode;
  /** Optional right-aligned control or legend (range toggle, etc). */
  action?: ReactNode;
  /** The chart body. */
  children: ReactNode;
  className?: string;
}

/**
 * Standard panel wrapper for a chart: title + optional summary value + optional
 * right-aligned control, then the chart. Standardizes padding so grids line up.
 */
export function ChartCard({
  title,
  value,
  action,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <div className={`panel flex flex-col rounded-2xl p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-widest text-muted">
            {title}
          </span>
          {value !== undefined && (
            <span className="text-2xl font-semibold tracking-tight nums">{value}</span>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
