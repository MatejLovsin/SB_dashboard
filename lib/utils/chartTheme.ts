'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Single source of truth for chart colors. Reads the design tokens defined in
 * `app/globals.css` so every Recharts/custom chart draws from the current
 * section's palette — "many shades of one color" per section (see
 * DESIGN_GUIDE.md "Per-section color themes"). Generalizes the per-file
 * `readVar()` helper the charts used to duplicate.
 */

export interface ChartTheme {
  /** Primary accent (current section's color) — key series, lines, single-series bars. */
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
  /** Section's scale light→dark, for categorical / graded series. */
  scale: [string, string, string, string, string, string];
}

// Matches :root's default (home/indigo) theme in app/globals.css — used only
// for SSR / before the [data-theme] element is queryable.
const FALLBACK: ChartTheme = {
  accent: '#6366f1',
  muted: '#8b8b93',
  border: '#2a2a2e',
  surface: '#111113',
  foreground: '#f2f2f3',
  up: '#4ade80',
  down: '#f87171',
  scale: ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca'],
};

// The [data-theme] attribute (set by AppShell) lives on a div *inside* body,
// not an ancestor of <html> — so getComputedStyle(document.documentElement)
// never sees section overrides. Read from that element instead.
function themeRoot(): Element {
  return document.querySelector('[data-theme]') ?? document.documentElement;
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return (
    getComputedStyle(themeRoot()).getPropertyValue(name).trim() || fallback
  );
}

/** Read the current chart theme from CSS variables. */
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
 * Hook form: resolves the theme from CSS vars and re-reads whenever the route
 * changes (the active section, and therefore --accent/--chart-*, changes per
 * route). Uses useLayoutEffect so the re-read happens after the [data-theme]
 * attribute has actually committed to the DOM, avoiding a stale first paint.
 */
export function useChartTheme(): ChartTheme {
  const pathname = usePathname();
  const [theme, setTheme] = useState(readChartTheme);
  useLayoutEffect(() => {
    setTheme(readChartTheme());
  }, [pathname]);
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
