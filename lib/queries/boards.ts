import type {
  Board,
  BoardEdge,
  BoardNode,
  BoardPage,
  BoardPhase,
  BoardViewport,
} from '@/lib/db/types';
import type { Client } from './fitness';

export const BOARD_PAGES: BoardPage[] = ['home', 'fitness', 'school', 'work', 'goals'];

export const PAGE_LABEL: Record<BoardPage, string> = {
  home: 'Home',
  fitness: 'Fitness',
  school: 'School',
  work: 'Work',
  goals: 'Goals',
};

/** A board as the list sees it: the row plus how far along its nodes are. */
export interface BoardSummary {
  board: Board;
  /** Ideas placed on the canvas. */
  nodes: number;
  done: number;
  /** Thoughts added from the phone, waiting in the tray to be placed. */
  unsorted: number;
}

export interface BoardContents {
  board: Board;
  phases: BoardPhase[];
  nodes: BoardNode[];
  edges: BoardEdge[];
}

export interface BoardInput {
  name: string;
  description?: string | null;
  pages?: BoardPage[];
}

/* ══ Reads ════════════════════════════════════════════════════════════════ */

/** Every board, last edited first. `page` narrows to the ones linked to a page. */
export async function listBoards(
  client: Client,
  opts: { page?: BoardPage } = {},
): Promise<BoardSummary[]> {
  let query = client.from('boards').select('*');
  if (opts.page) query = query.contains('pages', [opts.page]);

  const { data: boards, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  if (!boards?.length) return [];

  const { data: nodes, error: nodeError } = await client
    .from('board_nodes')
    .select('board_id, done, unsorted')
    .in('board_id', boards.map((b) => b.id));
  if (nodeError) throw nodeError;

  const empty = { nodes: 0, done: 0, unsorted: 0 };
  const counts = new Map<string, typeof empty>();
  for (const n of nodes ?? []) {
    const c = counts.get(n.board_id) ?? { ...empty };
    if (n.unsorted) c.unsorted += 1;
    else c.nodes += 1;
    if (n.done && !n.unsorted) c.done += 1;
    counts.set(n.board_id, c);
  }

  return boards.map((board) => ({ board, ...(counts.get(board.id) ?? empty) }));
}

export async function getBoard(client: Client, id: string): Promise<BoardContents | null> {
  const { data: board, error } = await client.from('boards').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!board) return null;

  const [phases, nodes, edges] = await Promise.all([
    client.from('board_phases').select('*').eq('board_id', id).order('created_at'),
    client.from('board_nodes').select('*').eq('board_id', id).order('created_at'),
    client.from('board_edges').select('*').eq('board_id', id).order('created_at'),
  ]);
  if (phases.error) throw phases.error;
  if (nodes.error) throw nodes.error;
  if (edges.error) throw edges.error;

  return { board, phases: phases.data ?? [], nodes: nodes.data ?? [], edges: edges.data ?? [] };
}

/* ══ Boards ═══════════════════════════════════════════════════════════════ */

export async function createBoard(client: Client, input: BoardInput): Promise<Board> {
  const { data, error } = await client.from('boards').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateBoard(
  client: Client,
  id: string,
  patch: BoardInput | { viewport: BoardViewport },
): Promise<void> {
  const { error } = await client.from('boards').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteBoard(client: Client, id: string): Promise<void> {
  const { error } = await client.from('boards').delete().eq('id', id);
  if (error) throw error;
}

/* ══ Nodes ════════════════════════════════════════════════════════════════ */

export type NodePatch = Partial<
  Pick<BoardNode, 'title' | 'body' | 'x' | 'y' | 'done' | 'unsorted' | 'phase_id' | 'goal_id'>
>;

export async function createNode(
  client: Client,
  input: {
    board_id: string;
    title: string;
    body?: string | null;
    x?: number;
    y?: number;
    unsorted?: boolean;
    phase_id?: string | null;
  },
): Promise<BoardNode> {
  const { data, error } = await client.from('board_nodes').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateNode(client: Client, id: string, patch: NodePatch): Promise<void> {
  const { error } = await client.from('board_nodes').update(patch).eq('id', id);
  if (error) throw error;
}

/**
 * One update per moved node — a drag rarely moves more than a handful. A move
 * that carries `phase_id` also changes which phase the idea sits in; its x/y
 * are then relative to that phase (or absolute when `phase_id` is null).
 */
export async function moveNodes(
  client: Client,
  moves: { id: string; x: number; y: number; phase_id?: string | null }[],
): Promise<void> {
  const results = await Promise.all(
    moves.map(({ id, ...patch }) => client.from('board_nodes').update(patch).eq('id', id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function deleteNodes(client: Client, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await client.from('board_nodes').delete().in('id', ids);
  if (error) throw error;
}

/* ══ Edges ════════════════════════════════════════════════════════════════ */

export async function createEdge(
  client: Client,
  input: { board_id: string; source_id: string; target_id: string },
): Promise<BoardEdge> {
  const { data, error } = await client.from('board_edges').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function setEdgeLabel(client: Client, id: string, label: string | null): Promise<void> {
  const { error } = await client.from('board_edges').update({ label }).eq('id', id);
  if (error) throw error;
}

export async function deleteEdges(client: Client, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await client.from('board_edges').delete().in('id', ids);
  if (error) throw error;
}
