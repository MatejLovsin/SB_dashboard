'use client';
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { TextArea } from './TextArea';
import { Markdown } from './Markdown';

// ---------------------------------------------------------------------------
// Markdown text surgery
//
// Everything below operates on the raw string + the textarea's selection and
// returns the new string plus the selection to restore. Kept as pure helpers so
// the component itself stays a thin shell around <TextArea>.
// ---------------------------------------------------------------------------

/** Any block-level prefix a line can already carry — stripped before a new one. */
const ANY_PREFIX = /^(#{1,6}\s+|[-*]\s+|\d+\.\s+|>\s+)/;

interface Edit {
  value: string;
  selStart: number;
  selEnd: number;
}

/** Expands a selection to cover the whole of every line it touches. */
function lineBounds(text: string, start: number, end: number) {
  const from = text.lastIndexOf('\n', start - 1) + 1;
  const nl = text.indexOf('\n', end);
  return { from, to: nl === -1 ? text.length : nl };
}

/**
 * Block prefixes — headings, bullets, numbers, quotes. Applies to every line the
 * selection touches, and toggles off when all of them already carry it.
 */
function applyLinePrefix(
  text: string,
  start: number,
  end: number,
  prefixAt: (index: number) => string,
  match: RegExp,
  placeholder: string,
): Edit {
  const { from, to } = lineBounds(text, start, end);
  const lines = text.slice(from, to).split('\n');
  const isEmptyBlock = lines.length === 1 && lines[0].trim() === '';

  const alreadyApplied = lines.every((l) => l.trim() === '' || match.test(l));
  const next = alreadyApplied
    ? lines.map((l) => l.replace(match, ''))
    : lines.map((l, i) => prefixAt(i) + l.replace(ANY_PREFIX, ''));

  // Nothing to prefix yet: drop in a placeholder and select it so typing replaces it.
  if (isEmptyBlock && !alreadyApplied) {
    const inserted = prefixAt(0) + placeholder;
    return {
      value: text.slice(0, from) + inserted + text.slice(to),
      selStart: from + prefixAt(0).length,
      selEnd: from + inserted.length,
    };
  }

  const block = next.join('\n');
  return {
    value: text.slice(0, from) + block + text.slice(to),
    selStart: from,
    selEnd: from + block.length,
  };
}

/** Inline markers — bold, italic, code. Toggles off when already wrapped. */
function applyWrap(
  text: string,
  start: number,
  end: number,
  marker: string,
  placeholder: string,
): Edit {
  const len = marker.length;
  const wrappedInside =
    text.slice(start - len, start) === marker && text.slice(end, end + len) === marker;

  if (wrappedInside) {
    return {
      value: text.slice(0, start - len) + text.slice(start, end) + text.slice(end + len),
      selStart: start - len,
      selEnd: end - len,
    };
  }

  const selected = text.slice(start, end);
  const inner = selected || placeholder;
  return {
    value: text.slice(0, start) + marker + inner + marker + text.slice(end),
    selStart: start + len,
    selEnd: start + len + inner.length,
  };
}

/** `[selection](url)` with the url placeholder selected, ready to paste over. */
function applyLink(text: string, start: number, end: number): Edit {
  const label = text.slice(start, end) || 'link text';
  const inserted = `[${label}](url)`;
  return {
    value: text.slice(0, start) + inserted + text.slice(end),
    selStart: start + inserted.length - 4,
    selEnd: start + inserted.length - 1,
  };
}

/**
 * Enter inside a list or quote continues it; Enter on an empty item ends it.
 * Returns null when the caret isn't in a continuable line, so the keypress falls
 * through to the browser's own newline.
 */
function continueList(text: string, caret: number): Edit | null {
  const from = text.lastIndexOf('\n', caret - 1) + 1;
  const line = text.slice(from, caret);
  const m = /^(\s*)([-*]\s+|\d+\.\s+|>\s+)(.*)$/.exec(line);
  if (!m) return null;

  const [, indent, marker, rest] = m;

  // Empty item → break out of the list instead of adding another bullet.
  if (rest.trim() === '') {
    return { value: text.slice(0, from) + text.slice(caret), selStart: from, selEnd: from };
  }

  const ordered = /^(\d+)\.\s+$/.exec(marker);
  const nextMarker = ordered ? `${Number(ordered[1]) + 1}. ` : marker;
  const inserted = `\n${indent}${nextMarker}`;
  return {
    value: text.slice(0, caret) + inserted + text.slice(caret),
    selStart: caret + inserted.length,
    selEnd: caret + inserted.length,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Tab = 'write' | 'preview';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Visible rows before the surface starts growing. */
  rows?: number;
  /** Rows before it stops growing and scrolls instead. */
  maxRows?: number;
  label?: string;
  id?: string;
  autoFocus?: boolean;
}

/**
 * The write side of every long-form surface. A plain markdown textarea set in
 * the reading face at the reading measure, plus a toolbar that inserts syntax at
 * the caret and a Preview tab that renders through the very same <Markdown> the
 * reader uses — so what you see here is exactly what gets read back.
 *
 * Storage is unchanged: the markdown source goes into the existing text column.
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
  maxRows = 28,
  label,
  id,
  autoFocus,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState<Tab>('write');
  const ref = useRef<HTMLTextAreaElement>(null);
  // Selection to restore after the parent re-renders with the new value.
  const pendingSel = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const sel = pendingSel.current;
    if (!el || !sel) return;
    pendingSel.current = null;
    el.focus();
    el.setSelectionRange(sel[0], sel[1]);
  });

  const commit = useCallback(
    (edit: Edit) => {
      pendingSel.current = [edit.selStart, edit.selEnd];
      onChange(edit.value);
    },
    [onChange],
  );

  const run = useCallback(
    (fn: (text: string, start: number, end: number) => Edit) => {
      const el = ref.current;
      if (!el) return;
      commit(fn(el.value, el.selectionStart, el.selectionEnd));
    },
    [commit],
  );

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const mod = e.metaKey || e.ctrlKey;

    if (mod && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'b' || key === 'i' || key === 'k') {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: en } = el;
        if (key === 'k') commit(applyLink(el.value, s, en));
        else commit(applyWrap(el.value, s, en, key === 'b' ? '**' : '*', key === 'b' ? 'bold' : 'italic'));
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && el.selectionStart === el.selectionEnd) {
      const edit = continueList(el.value, el.selectionStart);
      if (edit) {
        e.preventDefault();
        commit(edit);
      }
    }
  }

  const tools: { icon: ReactNode; title: string; onClick: () => void }[] = [
    {
      icon: <Heading2 className="h-4 w-4" />,
      title: 'Heading',
      onClick: () => run((t, s, e) => applyLinePrefix(t, s, e, () => '## ', /^#{2}\s+/, 'Heading')),
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      title: 'Subheading',
      onClick: () =>
        run((t, s, e) => applyLinePrefix(t, s, e, () => '### ', /^#{3}\s+/, 'Subheading')),
    },
    {
      icon: <Bold className="h-4 w-4" />,
      title: 'Bold (Ctrl+B)',
      onClick: () => run((t, s, e) => applyWrap(t, s, e, '**', 'bold')),
    },
    {
      icon: <Italic className="h-4 w-4" />,
      title: 'Italic (Ctrl+I)',
      onClick: () => run((t, s, e) => applyWrap(t, s, e, '*', 'italic')),
    },
    {
      icon: <List className="h-4 w-4" />,
      title: 'Bullet list',
      onClick: () => run((t, s, e) => applyLinePrefix(t, s, e, () => '- ', /^[-*]\s+/, 'Item')),
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      title: 'Numbered list',
      onClick: () =>
        run((t, s, e) => applyLinePrefix(t, s, e, (i) => `${i + 1}. `, /^\d+\.\s+/, 'Item')),
    },
    {
      icon: <Quote className="h-4 w-4" />,
      title: 'Quote',
      onClick: () => run((t, s, e) => applyLinePrefix(t, s, e, () => '> ', /^>\s+/, 'Quote')),
    },
    {
      icon: <Link2 className="h-4 w-4" />,
      title: 'Link (Ctrl+K)',
      onClick: () => run(applyLink),
    },
  ];

  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {label}
        </label>
      )}

      {/* Rail: mode tabs left, formatting tools right. Both sit on one hairline
          rule rather than in a toolbar box — no containers. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-y-2 border-b border-border pb-2">
        <div className="flex items-center gap-1">
          {(['write', 'preview'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`label rounded-lg px-2.5 py-1 text-[0.62rem] transition-colors ${
                tab === t ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-0.5 ${tab === 'write' ? '' : 'invisible'}`}>
          {tools.map((tool) => (
            <button
              key={tool.title}
              type="button"
              title={tool.title}
              aria-label={tool.title}
              // Keeps the caret where it is — the click must not blur the textarea.
              onMouseDown={(e) => e.preventDefault()}
              onClick={tool.onClick}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-border/40 hover:text-foreground"
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {tab === 'write' ? (
        <TextArea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={rows}
          maxRows={maxRows}
          autoFocus={autoFocus}
          className="longform reading-measure"
          // Inline, not utilities: these have to beat `inputClasses` (including
          // its focus:border-accent) deterministically. The writing surface is
          // borderless on purpose — the rail above already delimits it.
          style={{
            background: 'transparent',
            borderColor: 'transparent',
            paddingLeft: 0,
            paddingRight: 0,
            fontSize: '1.0625rem',
            lineHeight: 1.7,
          }}
        />
      ) : (
        <div style={{ minHeight: `calc(${rows} * 1.7 * 1.0625rem)` }}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm italic text-muted">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
