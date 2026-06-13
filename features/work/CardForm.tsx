'use client';
import { useState } from 'react';
import type { RoadmapStatus, Priority } from '@/lib/db/types';
import type { CardInput } from '@/lib/queries/work';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { inputClasses } from '@/components/ui/Input';

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
        rows={2}
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="card-status" className="mb-1.5 block text-sm font-medium">Column</label>
          <select
            id="card-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as RoadmapStatus)}
            className={inputClasses}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="card-priority" className="mb-1.5 block text-sm font-medium">Priority</label>
          <select
            id="card-priority"
            value={priority ?? ''}
            onChange={(e) => setPriority((e.target.value as Priority) || null)}
            className={inputClasses}
          >
            <option value="">None</option>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
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
