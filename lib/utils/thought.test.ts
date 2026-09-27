import { describe, expect, it } from 'vitest';
import { splitThought, THOUGHT_TITLE_MAX } from './thought';

describe('splitThought', () => {
  it('returns null for nothing but whitespace', () => {
    expect(splitThought('')).toBeNull();
    expect(splitThought('  \n\n \t')).toBeNull();
  });

  it('uses a single line as the title with no note', () => {
    expect(splitThought('  Try pause reps  ')).toEqual({ title: 'Try pause reps', body: null });
  });

  it('puts everything after the first line into the note', () => {
    expect(splitThought('Deload week\nDrop volume by half\n\n- keep intensity')).toEqual({
      title: 'Deload week',
      body: 'Drop volume by half\n\n- keep intensity',
    });
  });

  it('skips leading blank lines and normalises CRLF', () => {
    expect(splitThought('\r\n\r\nTitle\r\nBody')).toEqual({ title: 'Title', body: 'Body' });
  });

  it('carries an overlong first line into the note at a word boundary', () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const out = splitThought(`${words}\nmore`);
    expect(out).not.toBeNull();
    if (!out) return;
    expect(out.title.length).toBeLessThanOrEqual(THOUGHT_TITLE_MAX + 1);
    expect(out.title.endsWith('…')).toBe(true);
    expect(out.body?.startsWith('…word')).toBe(true);
    expect(out.body?.endsWith('\n\nmore')).toBe(true);
    // Nothing is lost between the two halves.
    const rejoined = `${out.title.slice(0, -1)} ${out.body?.split('\n\n')[0].slice(1)}`;
    expect(rejoined).toBe(words);
  });

  it('hard-cuts a first line with no usable space', () => {
    const out = splitThought('x'.repeat(200));
    expect(out?.title).toBe(`${'x'.repeat(THOUGHT_TITLE_MAX)}…`);
    expect(out?.body).toBe(`…${'x'.repeat(80)}`);
  });
});
