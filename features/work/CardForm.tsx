'use client';
import { useState } from 'react';
import type { RoadmapStatus, Priority } from '@/lib/db/types';
import type { CardInput } from '@/lib/queries/work';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

const STATUSES: { value: RoadmapStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

interface Props {
  initial?: Partial<CardInput>;
  defaultStatus?: RoadmapStatus;
  onSubmit: (input: CardInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function CardForm({ initial, defaultStatus = 'idea', onSubmit, onCancel, isPending }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<RoadmapStatus>(initial?.status ?? defaultStatus);
  const [priority, setPriority] = useState<Priority | null>(initial?.priority ?? null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description: description || null, status, priority });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        label="Title"
        id="card-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What are you working on?"
        required
        autoFocus
      />

      <TextArea
        label="Description (optional)"
        id="card-desc"
        value={description ?? ''}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Details, links, context…"
        rows={4}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="card-status" className="mb-1.5 block text-sm font-medium">Column</label>
          <Select
            id="card-status"
            value={status}
            onChange={(v) => setStatus(v as RoadmapStatus)}
            options={STATUSES}
          />
        </div>

        <div className="flex-1">
          <label htmlFor="card-priority" className="mb-1.5 block text-sm font-medium">Priority</label>
          <Select
            id="card-priority"
            value={priority ?? ''}
            onChange={(v) => setPriority((v as Priority) || null)}
            options={[{ value: '', label: 'None' }, ...PRIORITIES]}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!title.trim() || isPending}>
          {isPending ? 'Saving…' : initial?.title ? 'Save' : 'Add card'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
