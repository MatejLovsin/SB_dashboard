'use client';
import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { inputClasses } from '@/components/ui/Input';
import { useSelectPopup } from '@/components/ui/useSelectPopup';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Consecutive options sharing a group are listed under that heading. */
  group?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown, muted, when `value` matches no option. */
  placeholder?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
}

function step(options: SelectOption[], from: number, dir: 1 | -1): number {
  for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
    if (!options[i].disabled) return i;
  }
  return from;
}

/** Where a navigation key moves the highlight, or null for any other key. */
function moveFor(key: string, options: SelectOption[], active: number): number | null {
  if (key === 'ArrowDown') return step(options, active, 1);
  if (key === 'ArrowUp') return step(options, active, -1);
  if (key === 'Home') return step(options, -1, 1);
  if (key === 'End') return step(options, options.length, -1);
  return null;
}

/**
 * The app's dropdown. Replaces the native `<select>`, whose option list is
 * drawn by the OS and ignored the dark theme (white panel, unreadable ink).
 * The list is a `.floating-panel` portalled to the body, so it reads the same
 * inside a `FocusOverlay` as on the page. Keyboard: arrows, Home/End, Enter,
 * Space, Escape, Tab.
 */
export function Select({ value, onChange, options, placeholder = 'Select…', id, className = '', ...aria }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  const pos = useSelectPopup(open, close, triggerRef, listRef);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  function show() {
    setActive(selectedIndex >= 0 ? selectedIndex : step(options, -1, 1));
    setOpen(true);
  }

  function choose(i: number) {
    const o = options[i];
    if (!o || o.disabled) return;
    if (o.value !== value) onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        show();
      }
      return;
    }
    const next = moveFor(e.key, options, active);
    if (next !== null) {
      e.preventDefault();
      setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={aria['aria-label']}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={`${inputClasses} flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-muted'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {pos
        ? createPortal(
            <SelectList
              listRef={listRef}
              listId={listId}
              options={options}
              value={value}
              active={active}
              setActive={setActive}
              choose={choose}
              style={pos}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function SelectList({
  listRef, listId, options, value, active, setActive, choose, style,
}: {
  listRef: React.RefObject<HTMLUListElement | null>;
  listId: string;
  options: SelectOption[];
  value: string;
  active: number;
  setActive: (i: number) => void;
  choose: (i: number) => void;
  style: React.CSSProperties;
}) {
  return (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      style={style}
      className="floating-panel no-scrollbar fixed z-[60] overflow-y-auto rounded-xl py-1"
    >
      {options.map((o, i) => {
        const heading = o.group && o.group !== options[i - 1]?.group ? o.group : null;
        const isSelected = o.value === value;
        return (
          <li key={`${o.group ?? ''}:${o.value}`} role="presentation">
            {heading ? (
              <p className="label px-3.5 pb-1 pt-2.5 text-[10px] text-muted">{heading}</p>
            ) : null}
            <div
              id={`${listId}-${i}`}
              role="option"
              aria-selected={isSelected}
              aria-disabled={o.disabled || undefined}
              onPointerEnter={() => !o.disabled && setActive(i)}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm ${
                o.disabled ? 'cursor-default text-muted' : ''
              } ${i === active && !o.disabled ? 'bg-border/40' : ''} ${isSelected ? 'text-accent' : ''}`}
            >
              <span className="truncate">{o.label}</span>
              {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
