import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  /** Raw markdown source, exactly as it was typed and stored. */
  children: string;
  /** Extra classes on the reading surface (usually spacing, never type). */
  className?: string;
}

/**
 * The read side of every long-form surface — journal entries, work notes,
 * study session notes.
 *
 * All typography lives in `.longform-body` (see `app/globals.css`), so this
 * component only handles the two things CSS cannot: opening links safely and
 * giving wide tables their own scroll container instead of letting them push
 * the page sideways. Raw HTML in the source is NOT rendered (no `rehype-raw`)
 * — markdown in, markdown semantics out.
 *
 * Empty/whitespace-only content renders nothing; the caller supplies its own
 * "no notes" state.
 */
export function Markdown({ children, className = '' }: MarkdownProps) {
  if (!children?.trim()) return null;

  return (
    <div className={`longform-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: label }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {label}
            </a>
          ),
          table: ({ children: rows }) => (
            <div className="no-scrollbar overflow-x-auto">
              <table>{rows}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
