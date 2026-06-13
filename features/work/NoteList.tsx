'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import type { Note } from '@/lib/db/types';
import { workKeys, listNotes, createNote, updateNote, deleteNote, type NoteInput } from '@/lib/queries/work';
import { createClient } from '@/lib/supabase/client';
import { inputClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { NoteForm } from './NoteForm';

function NoteRow({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const date = new Date(note.entry_date + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="group rounded-2xl border border-border bg-[var(--surface)] p-4 transition-colors hover:border-accent/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{note.title}</p>
          {note.body && (
            <p className="mt-1 text-sm text-muted line-clamp-3 whitespace-pre-line">{note.body}</p>
          )}
          <p className="mt-2 text-xs text-muted">{date}</p>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="danger" size="icon" className="h-8 w-8" onClick={onDelete} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function NoteList() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Debounce search
  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout((handleSearch as { _t?: ReturnType<typeof setTimeout> })._t);
    (handleSearch as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(value),
      300,
    );
  }

  const { data: notes = [], isLoading } = useQuery({
    queryKey: workKeys.notes(debouncedSearch),
    queryFn: () => listNotes(supabase, debouncedSearch),
  });

  const createMutation = useMutation({
    mutationFn: (input: NoteInput) => createNote(supabase, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workKeys.notes() });
      setAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NoteInput> }) =>
      updateNote(supabase, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workKeys.notes() });
      setEditingNote(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(supabase, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: workKeys.notes(debouncedSearch) });
      const prev = queryClient.getQueryData<Note[]>(workKeys.notes(debouncedSearch));
      queryClient.setQueryData<Note[]>(workKeys.notes(debouncedSearch), (old) =>
        (old ?? []).filter((n) => n.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(workKeys.notes(debouncedSearch), ctx.prev);
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search notes…"
            className={`${inputClasses} pl-9`}
          />
        </div>
        <Button onClick={() => { setAdding(true); setEditingNote(null); }}>
          <Plus className="h-4 w-4" />
          New
        </Button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-2xl border border-accent/40 bg-card p-4">
          <NoteForm
            onSubmit={(input) => createMutation.mutate(input)}
            onCancel={() => setAdding(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={debouncedSearch ? 'No notes match your search' : 'No notes yet'}
          description={debouncedSearch ? 'Try different keywords.' : 'Start capturing decisions and ideas.'}
        />
      ) : (
        <div className="space-y-3">
          {notes.map((note) =>
            editingNote?.id === note.id ? (
              <div key={note.id} className="rounded-2xl border border-accent/40 bg-card p-4">
                <NoteForm
                  initial={{ title: note.title, body: note.body, entry_date: note.entry_date }}
                  onSubmit={(patch) => updateMutation.mutate({ id: note.id, patch })}
                  onCancel={() => setEditingNote(null)}
                  isPending={updateMutation.isPending}
                />
              </div>
            ) : (
              <NoteRow
                key={note.id}
                note={note}
                onEdit={() => { setEditingNote(note); setAdding(false); }}
                onDelete={() => deleteMutation.mutate(note.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}
