import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { inputClasses } from './Input';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, id, className = '', ...props },
  ref,
) {
  const field = (
    <textarea
      ref={ref}
      id={id}
      className={`${inputClasses} ${className}`}
      {...props}
    />
  );

  if (!label) return field;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {field}
    </div>
  );
});
