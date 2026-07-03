'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

// ---------------------------------------------------------------------------
// SortableExerciseList — drag-to-reorder wrapper shared by plan and session
// exercise lists. Each item owns its own root element (li, Card, ...); this
// only supplies the DnD context and the per-item sortable hookup.
// ---------------------------------------------------------------------------

export function SortableExerciseList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (orderedIds: string[]) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function useExerciseSortable(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  return {
    setNodeRef,
    isDragging,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      zIndex: isDragging ? 1 : undefined,
      position: 'relative' as const,
    },
    handleProps: { ...attributes, ...listeners },
  };
}

export function DragHandle(handleProps: ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted hover:bg-border/40 active:cursor-grabbing"
      {...handleProps}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
