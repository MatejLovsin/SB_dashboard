'use client';

import { createContext, useContext } from 'react';
import type { GoalSection } from '@/lib/db/types';

/** A linked goal as the board draws it. */
export interface GoalState {
  title: string;
  percent: number;
  achieved: boolean;
}

/** An active goal the picker can link to. */
export interface GoalOption {
  id: string;
  title: string;
  section: GoalSection;
}

export interface BoardGoals {
  /** Every goal a node or phase on this board links to, by id. */
  states: Record<string, GoalState>;
  options: GoalOption[];
}

interface BoardContextValue {
  goals: BoardGoals;
  /** Signed URLs for idea images, by storage path. */
  images: Record<string, string>;
  canEdit: boolean;
  resizePhase: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
}

// Custom nodes are rendered by React Flow, not by us, so what they need beyond
// their own data (goal progress, whether this device edits) arrives through
// context. Node data stays plain rows.
const BoardContext = createContext<BoardContextValue>({
  goals: { states: {}, options: [] },
  images: {},
  canEdit: false,
  resizePhase: () => {},
});

export const BoardContextProvider = BoardContext.Provider;

export const useBoardContext = () => useContext(BoardContext);

/** The linked goal's state, or undefined for no link (or a goal since deleted). */
export function useGoalState(goalId: string | null): GoalState | undefined {
  const { goals } = useBoardContext();
  return goalId ? goals.states[goalId] : undefined;
}

/** The signed URL for an idea's image, if it has one and it signed. */
export function useImageUrl(path: string | null): string | undefined {
  const { images } = useBoardContext();
  return path ? images[path] : undefined;
}
