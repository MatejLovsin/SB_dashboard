'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { splitThought } from '@/lib/utils/thought';

interface ThoughtFormProps {
  /** Offered as a picker when given (on /boards); omitted on a board itself. */
  boards?: { id: string; name: string }[];
  onAdd: (boardId: string | null, thought: { title: string; body: string | null }) => Promise<boolean>;
  onCancel: () => void;
}

// Quick-add from the phone: one box, one tap. The first line is the title, the
// rest is the note, and it lands in the board's Unsorted tray to be placed on
// the canvas later, at a computer.
export function ThoughtForm({ boards, onAdd, onCancel }: ThoughtFormProps) {
  const [text, setText] = useState('');
  const [boardId, setBoardId] = useState(boards?.[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  // After a submit: what was added, or that it failed. Cleared on typing.
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const thought = splitThought(text);
  const ready = thought !== null && (!boards || boardId !== '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!thought || !ready) return;
    setPending(true);
    const ok = await onAdd(boards ? boardId : null, thought);
    setPending(false);
    if (ok) setText('');
    setStatus(
      ok ? { ok, text: `Added · ${thought.title}` } : { ok, text: 'Could not add it. Try again.' },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {boards && boards.length > 1 ? (
        <label className="block">
          <span className="label mb-1.5 block text-[10px] text-muted">Board</span>
          <select
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
            className={inputClasses}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <TextArea
        label="Thought"
        id="thought"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setStatus(null);
        }}
        placeholder={'First line is the idea\nAnything below becomes its note'}
        rows={4}
        maxRows={10}
        autoFocus
      />
      {status ? (
        <p
          className={`label truncate text-[10px] ${status.ok ? 'text-accent' : 'text-down'}`}
          role="status"
        >
          {status.text}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!ready || pending}>
          {pending ? 'Adding…' : 'Add to Unsorted'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Done
        </Button>
      </div>
    </form>
  );
}
