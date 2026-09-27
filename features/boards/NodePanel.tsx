'use client';

import { useState } from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import type { NodePatch } from '@/lib/queries/boards';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Markdown } from '@/components/ui/Markdown';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import type { IdeaData } from './useBoardGraph';

interface NodePanelProps {
  data: IdeaData;
  canEdit: boolean;
  onSave: (patch: NodePatch) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}

// The inside of an idea: its full markdown note. Desktop edits it; the phone
// reads it.
export function NodePanel({ data, canEdit, onSave, onDelete, onClose }: NodePanelProps) {
  if (!canEdit) return <NodeReading data={data} />;
  return <NodeEditing data={data} onSave={onSave} onDelete={onDelete} onClose={onClose} />;
}

function NodeReading({ data }: { data: IdeaData }) {
  return (
    <div className="space-y-4">
      {data.done ? (
        <span className="label flex items-center gap-1.5 text-[11px] text-accent">
          <CircleCheck className="h-3.5 w-3.5" /> Done
        </span>
      ) : null}
      {data.body ? (
        <Markdown>{data.body}</Markdown>
      ) : (
        <p className="text-sm text-muted">No notes on this idea yet.</p>
      )}
    </div>
  );
}

function NodeEditing({ data, onSave, onDelete, onClose }: Omit<NodePanelProps, 'canEdit'>) {
  const [title, setTitle] = useState(data.title);
  const [body, setBody] = useState(data.body ?? '');
  const [done, setDone] = useState(data.done);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    const ok = await onSave({ title: title.trim(), body: body.trim() ? body : null, done });
    setPending(false);
    if (ok) onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Idea"
        id="idea-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        required
        autoFocus
      />
      <MarkdownEditor
        label="Notes"
        id="idea-body"
        value={body}
        onChange={setBody}
        placeholder="Why it matters, what it needs, open questions…"
        rows={8}
        maxRows={26}
      />
      <button
        type="button"
        aria-pressed={done}
        onClick={() => setDone((d) => !d)}
        className={`flex items-center gap-2 text-sm transition-colors ${
          done ? 'text-accent' : 'text-muted hover:text-foreground'
        }`}
      >
        {done ? <CircleCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        {done ? 'Done' : 'Mark as done'}
      </button>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={!title.trim() || pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          className="ml-auto"
          onClick={() => (confirming ? onDelete() : setConfirming(true))}
        >
          {confirming ? 'Delete for good?' : 'Delete idea'}
        </Button>
      </div>
    </form>
  );
}
