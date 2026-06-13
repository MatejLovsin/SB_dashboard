'use client';

// Calendar heatmap showing the last `weeks` weeks of activity for one exercise.
// Columns = weeks (oldest left → newest right), rows = days (Mon top → Sun bottom).

interface Props {
  activeDays: string[]; // ISO date strings like '2024-01-15'
  weeks?: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function ConsistencyHeatmap({ activeDays, weeks = 12 }: Props) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const activeSet = new Set(activeDays);

  // Monday of the current week (UTC)
  const dow = today.getUTCDay(); // 0 = Sunday
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const startDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  startDate.setUTCDate(startDate.getUTCDate() - daysToMonday - (weeks - 1) * 7);

  const days = Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    return { date: ds, active: activeSet.has(ds), future: ds > todayStr };
  });

  return (
    <div className="flex gap-2">
      {/* Day-of-week labels */}
      <div className="flex shrink-0 flex-col justify-between py-0.5" style={{ gap: '3px' }}>
        {DAY_LABELS.map((label, i) => (
          <span key={i} className="text-muted" style={{ fontSize: 10, lineHeight: '14px', height: 14 }}>
            {i % 2 === 0 ? label : ''}
          </span>
        ))}
      </div>

      {/* Heatmap grid: column-major (week columns, day rows) */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: 'repeat(7, 14px)',
          gridAutoFlow: 'column',
          gridAutoColumns: '14px',
          gap: '3px',
          flex: 1,
        }}
      >
        {days.map(({ date, active, future }) => (
          <div
            key={date}
            title={date}
            style={{
              borderRadius: 3,
              backgroundColor: future
                ? 'transparent'
                : active
                  ? 'var(--accent)'
                  : 'var(--border)',
              opacity: future ? 0 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
