'use client';

import { useState } from 'react';
import { Circle, CircleCheck } from 'lucide-react';
import type { NodePatch } from '@/lib/queries/boards';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import type { IdeaData } from './boardFlow';
import { useImageUrl } from './boardContext';
import { GoalLinkField, GoalLinkStatus } from './goalLinks';
import { ImageField, pastedImage } from './ImageField';
import type { ImageChange } from './useIdeaImages';

interface NodePanelProps {
  data: IdeaData;
  onSave: (patch: NodePatch, image: ImageChange) => Promise<boolean>;
  onDelete: () => void;
  onClose: () => void;
}

// The idea's form: its title, full markdown note, image, done and goal link.
// Reading it is NodeReading's job.
export function NodePanel({ data, onSave, onDelete, onClose }: NodePanelProps) {
  const [title, setTitle] = useState(data.title);
  const [body, setBody] = useState(data.body ?? '');
  const [done, setDone] = useState(data.done);
  const [goalId, setGoalId] = useState(data.goalId ?? '');
  const [image, setImage] = useState<ImageChange>(null);
  const imageUrl = useImageUrl(data.imagePath);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    const ok = await onSave({
      title: title.trim(),
      body: body.trim() ? body : null,
      done,
      goal_id: goalId || null,
    }, image);
    setPending(false);
    if (ok) onClose();
  }

  return (
    <form
      onSubmit={submit}
      onPaste={(e) => {
        const file = pastedImage(e);
        if (!file) return;
        e.preventDefault();
        setImage({ kind: 'set', file });
      }}
      className="space-y-4"
    >
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
      <ImageField currentUrl={imageUrl} change={image} onChange={setImage} />
      <DoneToggle done={done} onToggle={() => setDone((d) => !d)} />
      <GoalLinkField value={goalId} onChange={setGoalId} />
      {goalId === (data.goalId ?? '') ? <GoalLinkStatus goalId={data.goalId} /> : null}

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

/** Manual done, shared by the idea and phase forms. */
export function DoneToggle({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={onToggle}
      className={`flex items-center gap-2 text-sm transition-colors ${
        done ? 'text-accent' : 'text-muted hover:text-foreground'
      }`}
    >
      {done ? <CircleCheck className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {done ? 'Done' : 'Mark as done'}
    </button>
  );
}
