'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { PlanInput } from '@/lib/queries/plans';

interface PlanFormProps {
  defaultValues?: Partial<PlanInput>;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: (values: PlanInput) => void;
  onCancel?: () => void;
}

// Controlled form for a plan's metadata (name / category / notes). Reused for
// both creating a plan and editing an existing one's details.
export function PlanForm({
  defaultValues,
  submitLabel = 'Save',
  pending = false,
  onSubmit,
  onCancel,
}: PlanFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? '');
  const [category, setCategory] = useState(defaultValues?.category ?? '');
  const [notes, setNotes] = useState(defaultValues?.notes ?? '');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category: category.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="plan-name"
        label="Name"
        required
        value={name}
        placeholder="Push A"
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        id="plan-category"
        label="Category"
        value={category ?? ''}
        placeholder="Push / Pull / Legs (optional)"
        onChange={(event) => setCategory(event.target.value)}
      />
      <TextArea
        id="plan-notes"
        label="Notes"
        value={notes ?? ''}
        placeholder="Optional notes about this plan"
        rows={3}
        onChange={(event) => setNotes(event.target.value)}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? <Spinner /> : null}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
