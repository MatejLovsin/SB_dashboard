'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface EdgePanelProps {
  label: string | null;
  onSave: (label: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

// A line only means "related"; the optional label says how.
export function EdgePanel({ label, onSave, onDelete, onClose }: EdgePanelProps) {
  const [value, setValue] = useState(label ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(value.trim() || null);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Label (optional)"
        id="edge-label"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="needs, feeds into, same client…"
        maxLength={40}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <Button type="submit">Save</Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          className="ml-auto"
          onClick={() => {
            onDelete();
            onClose();
          }}
        >
          Remove line
        </Button>
      </div>
    </form>
  );
}
