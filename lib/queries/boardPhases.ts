import type { BoardPhase } from '@/lib/db/types';
import type { Client } from './fitness';

// A phase is a region of the board that groups ideas. Ideas inside one store
// their x/y relative to the phase's top-left, which is what React Flow expects
// of a child node.

export type PhasePatch = Partial<
  Pick<BoardPhase, 'title' | 'x' | 'y' | 'width' | 'height' | 'done' | 'goal_id'>
>;

export async function createPhase(
  client: Client,
  input: { board_id: string; title: string; x: number; y: number; width: number; height: number },
): Promise<BoardPhase> {
  const { data, error } = await client.from('board_phases').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updatePhase(client: Client, id: string, patch: PhasePatch): Promise<void> {
  const { error } = await client.from('board_phases').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * Deletes a phase but keeps its ideas where they are on the canvas. The FK
 * would null `phase_id` by itself, but it would leave the positions relative to
 * a phase that no longer exists, so each child is first rewritten to absolute.
 */
export async function deletePhase(client: Client, id: string): Promise<void> {
  const { data: phase, error: phaseError } = await client
    .from('board_phases')
    .select('x, y')
    .eq('id', id)
    .single();
  if (phaseError) throw phaseError;

  const { data: children, error } = await client
    .from('board_nodes')
    .select('id, x, y')
    .eq('phase_id', id);
  if (error) throw error;

  const results = await Promise.all(
    (children ?? []).map((c) =>
      client
        .from('board_nodes')
        .update({ phase_id: null, x: c.x + phase.x, y: c.y + phase.y })
        .eq('id', c.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  const { error: deleteError } = await client.from('board_phases').delete().eq('id', id);
  if (deleteError) throw deleteError;
}
