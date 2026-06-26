'use client';

import type { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { tooltipStyle, useChartTheme } from '@/lib/utils/chartTheme';

export interface DonutSlice {
  name: string;
  value: number;
}

interface DonutStatProps {
  data: DonutSlice[];
  /** Big label drawn in the donut hole. */
  centerValue: ReactNode;
  /** Small caption under the center value. */
  centerLabel?: string;
  height?: number;
  /** Show a stacked legend to the right of the donut. */
  showLegend?: boolean;
}

/** Donut chart with a center value — the benchmark's "78%" / "24,648" rings. */
export function DonutStat({
  data,
  centerValue,
  centerLabel,
  height = 200,
  showLegend = true,
}: DonutStatProps) {
  const theme = useChartTheme();
  // Spread slices across the blue scale (skip the lightest two for contrast).
  const colorAt = (i: number) => theme.scale[(i % 4) + 2];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%" debounce={1}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={900}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colorAt(i)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle(theme)}
              formatter={(v, n) => {
                const num = Number(v);
                return [
                  total > 0 ? `${num} (${Math.round((num / total) * 100)}%)` : num,
                  n,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight nums">{centerValue}</span>
          {centerLabel && (
            <span className="text-[11px] uppercase tracking-widest text-muted">
              {centerLabel}
            </span>
          )}
        </div>
      </div>

      {showLegend && (
        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colorAt(i) }}
              />
              <span className="truncate text-muted">{d.name}</span>
              <span className="ml-auto font-medium nums">{d.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
