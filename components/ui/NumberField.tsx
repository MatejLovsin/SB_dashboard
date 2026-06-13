'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode'> {
  // `decimal` allows a decimal point (weights); otherwise integer-only (reps).
  decimal?: boolean;
}

// Numpad-friendly numeric input for the workout logger: a big, centered tap
// target that opens the numeric keypad on mobile and selects its contents on
// focus so an existing (pre-filled) value is overwritten in one tap.
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField({ decimal = false, className = '', onFocus, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        onFocus={(event) => {
          event.target.select();
          onFocus?.(event);
        }}
        className={`w-full rounded-xl border border-border bg-card px-2 py-3 text-center text-base tabular-nums outline-none transition-colors focus:border-accent disabled:opacity-60 ${className}`}
        {...props}
      />
    );
  },
);
