'use client';
import { useState } from 'react';
import type { NoteInput } from '@/lib/queries/work';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';

interface Props {
  initial?: Partial<NoteInput>;
  onSubmit: (input: NoteInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function NoteForm({ initial, onSubmit, onCancel, isPending }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [entryDate, setEntryDate] = useState(initial?.entry_date ?? today);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, body: body || null, entry_date: entryDate });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        label="Title"
        id="note-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Decision, idea, or note title"
        required
        autoFocus
      />

      <TextArea
        label="Body (optional)"
        id="note-body"
        value={body ?? ''}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Context, reasoning, links…"
        rows={4}
      />

      <Input
        label="Date"
        id="note-date"
        type="date"
        value={entryDate}
        onChange={(e) => setEntryDate(e.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={!title.trim() || isPending}>
          {isPending ? 'Saving…' : initial?.title ? 'Save' : 'Add note'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
