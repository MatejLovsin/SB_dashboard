/**
 * Helpers for the long-form surfaces (journal entries, work notes, study
 * session notes). The entries are stored as raw markdown in their existing text
 * columns — these turn that source back into something a compact list row can
 * show without leaking `##` and `**` into the preview.
 */

/**
 * Flattens markdown to plain prose for a truncated list preview.
 *
 * Deliberately regex-based rather than a real parse: the output is never
 * rendered as markup, only clamped to a line or two in a card, so the cost of
 * pulling the parser into every list is not worth it. Fenced code blocks are
 * dropped entirely (a preview of a code block tells you nothing); everything
 * else keeps its text and loses its syntax.
 */
export function markdownExcerpt(source: string | null | undefined): string {
  if (!source) return '';

  return source
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/^\s{0,3}(#{1,6})\s+/gm, '') // heading markers
    .replace(/^\s{0,3}>\s?/gm, '') // quote markers
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '') // task list markers
    .replace(/^\s*[-*+]\s+/gm, '') // bullets
    .replace(/^\s*\d+\.\s+/gm, '') // ordered markers
    .replace(/^\s{0,3}([-*_])\s*(\1\s*){2,}$/gm, ' ') // thematic breaks
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images → alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → label
    .replace(/(\*{1,3})(?=\S)([\s\S]*?\S)\1/g, '$2') // bold / italic / both
    // Underscore emphasis only at word boundaries, so snake_case survives.
    .replace(/(?<![A-Za-z0-9_])(_{1,3})(?=\S)([\s\S]*?\S)\1(?![A-Za-z0-9_])/g, '$2')
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]*)`/g, '$1') // inline code
    .replace(/\s*\n\s*/g, ' ') // collapse to one line
    .replace(/\s{2,}/g, ' ')
    .trim();
}
