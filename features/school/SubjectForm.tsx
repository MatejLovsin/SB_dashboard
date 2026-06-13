'use client';
import { useState } from 'react';
import type { SubjectInput } from '@/lib/queries/school';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899'];

interface Props {
  initial?: { name?: string; color?: string | null };
  onSubmit: (input: SubjectInput) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function SubjectForm({ initial, onSubmit, onCancel, isPending }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? COLORS[5]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name, color });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input
        label="Name"
        id="subject-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Calculus"
        autoFocus
      />
      <div>
        <p className="mb-1.5 text-sm font-medium">Color</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full transition-transform ${
                color === c ? 'ring-2 ring-accent ring-offset-2 scale-110' : ''
              }`}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!name.trim() || isPending}>
          {isPending ? 'Saving…' : initial ? 'Save' : 'Add subject'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
