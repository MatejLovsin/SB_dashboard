import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: number | null;
  caption?: string;
  children?: ReactNode;
  className?: string;
}

function formatDelta(delta: number): string {
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  return `${delta > 0 ? '+' : '-'}${rounded}%`;
}

export function StatTile({
  label,
  value,
  unit,
  delta,
  caption,
  children,
  className = '',
}: StatTileProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = hasDelta && (delta as number) >= 0;

  return (
    <div className={`panel flex flex-col gap-2 rounded-2xl p-4 ${className}`}>
      <span className="text-[11px] font-medium uppercase tracking-widest text-muted">
        {label}
      </span>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-4xl font-bold tracking-tight nums leading-none">{value}</span>
          {unit && <span className="text-sm font-medium text-muted">{unit}</span>}
        </div>

        {hasDelta && (
          <span
            className="mb-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold nums"
            style={{
              color: up ? 'var(--up)' : 'var(--down)',
              background: up ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            }}
          >
            {up ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
            )}
            {formatDelta(delta as number)}
          </span>
        )}
      </div>

      {caption && <span className="text-xs text-muted">{caption}</span>}
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
