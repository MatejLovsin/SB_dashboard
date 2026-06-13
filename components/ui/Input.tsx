import { forwardRef, type InputHTMLAttributes } from 'react';

export const inputClasses =
  'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent disabled:opacity-60';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

// Styled text/number input. Pass `label` to render an associated <label>.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, id, className = '', ...props },
  ref,
) {
  const input = (
    <input ref={ref} id={id} className={`${inputClasses} ${className}`} {...props} />
  );

  if (!label) return input;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {input}
    </div>
  );
});
