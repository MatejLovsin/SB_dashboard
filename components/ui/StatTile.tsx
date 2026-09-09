import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: number | null;
  caption?: string;
  /**
   * The one metric on a hub that emits light. At most one per screen — more
   * than that and none of them reads as the headline.
   */
  lead?: boolean;
  children?: ReactNode;
  className?: string;
}

function formatDelta(delta: number): string {
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  return `${delta > 0 ? '+' : '-'}${rounded}%`;
}

// No fill, no border box: a micro-label, a big display number, and whatever
// sparkline the caller passes. The hairline rule comes from `panel`.
export function StatTile({
  label,
  value,
  unit,
  delta,
  caption,
  lead = false,
  children,
  className = '',
}: StatTileProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = hasDelta && (delta as number) >= 0;

  return (
    <div className={`panel flex flex-col gap-2.5 px-3 pb-4 pt-3.5 ${className}`}>
      <span className="label text-[10px] text-muted">{label}</span>

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className={`nums text-[28px] font-bold leading-none ${lead ? 'emissive' : ''}`}>
          {value}
        </span>
        {unit && <span className="label text-[10px] text-muted">{unit}</span>}

        {hasDelta && (
          <span
            className="nums text-[11px] font-medium"
            style={{ color: up ? 'var(--up)' : 'var(--down)' }}
          >
            {formatDelta(delta as number)}
          </span>
        )}
      </div>

      {caption && <span className="text-xs text-muted">{caption}</span>}
      {children && <div className="mt-auto pt-1">{children}</div>}
    </div>
  );
}
