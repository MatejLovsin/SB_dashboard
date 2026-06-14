'use client';

import { useState } from 'react';

/**
 * Single source of truth for chart colors. Reads the design tokens defined in
 * `app/globals.css` so every Recharts/custom chart draws from the same navy+blue
 * palette — "many shades of one color". Generalizes the per-file `readVar()`
 * helper the charts used to duplicate.
 */

export interface ChartTheme {
  /** Primary blue — key series, lines, single-series bars. */
  accent: string;
  /** Secondary text / axis ticks / gridlines. */
  muted: string;
  /** Hairline border color (gridlines, donut tracks). */
  border: string;
  /** Raised surface (tooltip background). */
  surface: string;
  /** Foreground text (tooltip text, center labels). */
  foreground: string;
  /** Positive / negative delta colors. */
  up: string;
  down: string;
  /** Blue scale light→dark, for categorical / graded series. */
  scale: [string, string, string, string, string, string];
}

const FALLBACK: ChartTheme = {
  accent: '#3b82f6',
  muted: '#7d8aa6',
  border: '#1e2a44',
  surface: '#0d1322',
  foreground: '#e8edf7',
  up: '#4ade80',
  down: '#f87171',
  scale: ['#bfdbfe', '#7eb0fb', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
};

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

/** Read the current chart theme from CSS variables (computed once on mount). */
export function readChartTheme(): ChartTheme {
  if (typeof window === 'undefined') return FALLBACK;
  return {
    accent: readVar('--accent', FALLBACK.accent),
    muted: readVar('--muted', FALLBACK.muted),
    border: readVar('--border', FALLBACK.border),
    surface: readVar('--surface', FALLBACK.surface),
    foreground: readVar('--foreground', FALLBACK.foreground),
    up: readVar('--up', FALLBACK.up),
    down: readVar('--down', FALLBACK.down),
    scale: [
      readVar('--chart-1', FALLBACK.scale[0]),
      readVar('--chart-2', FALLBACK.scale[1]),
      readVar('--chart-3', FALLBACK.scale[2]),
      readVar('--chart-4', FALLBACK.scale[3]),
      readVar('--chart-5', FALLBACK.scale[4]),
      readVar('--chart-6', FALLBACK.scale[5]),
    ],
  };
}

/**
 * Hook form: resolves the theme once on first client render and keeps it stable.
 * (The theme is static dark-only, so there's no need to re-read on changes.)
 */
export function useChartTheme(): ChartTheme {
  const [theme] = useState(readChartTheme);
  return theme;
}

/** Standard animation config for Recharts series — spread onto Area/Bar/Line. */
export const chartAnim = {
  isAnimationActive: true,
  animationDuration: 900,
  animationEasing: 'ease-out' as const,
} as const;

/** Shared tooltip style for Recharts `contentStyle`. */
export function tooltipStyle(theme: ChartTheme) {
  return {
    borderRadius: 10,
    fontSize: 12,
    border: `1px solid ${theme.border}`,
    background: theme.surface,
    color: theme.foreground,
    boxShadow: '0 8px 24px -12px rgba(0,0,0,0.6)',
  } as const;
}
