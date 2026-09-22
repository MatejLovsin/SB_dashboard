// Placeholder shapes for a loading screen, where they render dimmed to a ghost
// behind the goal (see LoadingScreen). The point is to echo the destination
// page's layout so the page appears to come up to light, not to mimic it.
//
// Deliberately motionless: a pulsing skeleton would compete with the one thing
// on that screen that is meant to move. Faint washes and hairlines, never
// outlined boxes.

function Block({ className = '' }: { className?: string }) {
  return <div className={`rounded bg-card-2 ${className}`} aria-hidden="true" />;
}

export function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <Block className="h-3 w-24" />
      <Block className="h-6 w-44" />
    </div>
  );
}

/** A row of StatTiles. */
export function SkeletonTiles({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-2 border-t border-border pt-3">
          <Block className="h-2.5 w-12" />
          <Block className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A ChartCard-sized panel. */
export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <Block className="h-2.5 w-28" />
      <Block className="h-40 w-full" />
    </div>
  );
}

/** A list, a plan rail, a kanban column — anything that repeats. */
export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-t border-border pt-2.5">
          <Block className="h-8 w-8 shrink-0 rounded-full" />
          <Block className="h-3 flex-1" />
          <Block className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}
