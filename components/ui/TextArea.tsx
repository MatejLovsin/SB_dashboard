'use client';
import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { inputClasses } from './Input';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  /** Maximum number of visible rows before the custom scrollbar appears. */
  maxRows?: number;
}

function adjustHeight(el: HTMLTextAreaElement, maxRows: number) {
  el.style.height = 'auto';
  const cs = getComputedStyle(el);
  const lineHeight = parseFloat(cs.lineHeight) || 20;
  const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const maxH = lineHeight * maxRows + paddingY;
  if (el.scrollHeight > maxH) {
    el.style.height = `${maxH}px`;
    el.style.overflowY = 'auto';
  } else {
    el.style.height = `${el.scrollHeight}px`;
    el.style.overflowY = 'hidden';
  }
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, id, className = '', maxRows = 12, style, ...props },
  ref,
) {
  const localRef = useRef<HTMLTextAreaElement>(null);

  const combinedRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      (localRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    },
    [ref],
  );

  // Runs after every render — cheap single-node style mutation, handles both
  // controlled (value prop) and uncontrolled scenarios without special-casing.
  useLayoutEffect(() => {
    if (localRef.current) adjustHeight(localRef.current, maxRows);
  });

  const field = (
    <textarea
      ref={combinedRef}
      id={id}
      className={`${inputClasses} resize-none ${className}`}
      style={{ overflowY: 'hidden', ...style }}
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
