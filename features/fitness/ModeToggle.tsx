'use client';

// Shared "Weights | Cardio" pill toggle used by Session log, Compare, and History
// so cardio views live inside the existing screens instead of adding new hub cards.
export function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'weights' | 'cardio';
  onChange: (mode: 'weights' | 'cardio') => void;
}) {
  return (
    <div className="mb-4 flex gap-2">
      {(['weights', 'cardio'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium press-flash transition-colors ${
            mode === m
              ? 'bg-accent text-white'
              : 'border border-border bg-card text-muted hover:text-foreground'
          }`}
        >
          {m === 'weights' ? 'Weights' : 'Cardio'}
        </button>
      ))}
    </div>
  );
}
