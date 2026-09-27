// A thought typed with a thumb becomes an idea: the first non-empty line is
// its title, everything after is its note. Shared by the two quick-add forms
// (on /boards and on a board), so they cannot disagree.

/** Titles are one glance long; anything past this spills into the note. */
export const THOUGHT_TITLE_MAX = 120;

export function splitThought(text: string): { title: string; body: string | null } | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first === -1) return null;

  let title = lines[first].trim();
  let rest = lines.slice(first + 1).join('\n').trim();

  if (title.length > THOUGHT_TITLE_MAX) {
    // Cut at the last word boundary that fits and carry the remainder down.
    const cut = title.lastIndexOf(' ', THOUGHT_TITLE_MAX);
    const at = cut > THOUGHT_TITLE_MAX / 2 ? cut : THOUGHT_TITLE_MAX;
    const overflow = title.slice(at).trim();
    title = `${title.slice(0, at).trim()}…`;
    rest = rest ? `…${overflow}\n\n${rest}` : `…${overflow}`;
  }

  return { title, body: rest || null };
}
