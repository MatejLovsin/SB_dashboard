'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  schoolKeys, listSubjects, createSubject, updateSubject, deleteSubject,
  type SubjectInput,
} from '@/lib/queries/school';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SubjectForm } from './SubjectForm';
import { Pencil, Trash2, Plus, ChevronRight } from 'lucide-react';

export function SubjectList() {
  const supabase = createClient();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: subjects = [], isPending } = useQuery({
    queryKey: schoolKeys.subjects(),
    queryFn: () => listSubjects(supabase),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: schoolKeys.subjects() });

  const addMut = useMutation({
    mutationFn: (input: SubjectInput) => createSubject(supabase, input),
    onSuccess: () => { refresh(); setAdding(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SubjectInput> }) =>
      updateSubject(supabase, id, patch),
    onSuccess: () => { refresh(); setEditingId(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => deleteSubject(supabase, id),
    onSuccess: refresh,
  });

  if (isPending) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted"><Spinner /> Loading…</div>;
  }

  return (
    <div className="space-y-3">
      {adding && (
        <Card>
          <SubjectForm
            onSubmit={(i) => addMut.mutate(i)}
            onCancel={() => setAdding(false)}
            isPending={addMut.isPending}
          />
        </Card>
      )}

      {subjects.map((s) =>
        editingId === s.id ? (
          <Card key={s.id}>
            <SubjectForm
              initial={{ name: s.name, color: s.color }}
              onSubmit={(patch) => editMut.mutate({ id: s.id, patch })}
              onCancel={() => setEditingId(null)}
              isPending={editMut.isPending}
            />
          </Card>
        ) : (
          <Card key={s.id} className="flex items-center gap-3 p-4">
            <Link
              href={`/school/subjects/${s.id}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: s.color ?? '#6b7280' }}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => setEditingId(s.id)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => delMut.mutate(s.id)}
                disabled={delMut.isPending && delMut.variables === s.id}
                aria-label="Delete"
                className="text-red-500 hover:text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )
      )}

      {subjects.length === 0 && !adding && (
        <p className="py-8 text-center text-sm text-muted">No subjects yet.</p>
      )}

      {!adding && (
        <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add subject
        </Button>
      )}
    </div>
  );
}
