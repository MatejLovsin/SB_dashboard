'use client';

import type { ProgrammeEmphasis } from '@/lib/db/types';

// null → heavy → light → null. Same cycle and the same two colors the weekly
// programme strip uses, so a chip means the same thing wherever it appears.
export function nextEmphasis(current: ProgrammeEmphasis | null): ProgrammeEmphasis | null {
  if (current === null) return 'heavy';
  if (current === 'heavy') return 'light';
  return null;
}

const STYLE: Record<ProgrammeEmphasis, { label: string; color: string; bg: string }> = {
  heavy: { label: 'Heavy', color: 'var(--load-heavy)', bg: 'var(--load-heavy-soft)' },
  light: { label: 'Light', color: 'var(--load-light)', bg: 'var(--load-light-soft)' },
};

const TITLE: Record<string, string> = {
  heavy: 'Heavy — near failure. Sets the est-1RM trend line.',
  light: 'Light — technique / volume. Tracked as its own line.',
  none: 'No emphasis — counted with the heavy days. Tap to set one.',
};

interface Props {
  value: ProgrammeEmphasis | null;
  disabled?: boolean;
  onCycle: () => void;
}

/** Tap-to-cycle heavy/light marker. Unset renders as a faint "Set load" hint. */
export function EmphasisChip({ value, disabled, onCycle }: Props) {
  const style = value ? STYLE[value] : null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onCycle}
      title={TITLE[value ?? 'none']}
      aria-label={value ? `Load: ${style?.label}. Tap to change.` : 'Set load emphasis'}
      className="shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity disabled:opacity-50"
      style={
        style
          ? { color: style.color, borderColor: style.bg, background: style.bg }
          : { color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent' }
      }
    >
      {style?.label ?? 'Load'}
    </button>
  );
}
