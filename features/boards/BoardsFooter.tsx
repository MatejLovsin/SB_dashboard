import Link from 'next/link';
import { Waypoints } from 'lucide-react';
import { CardTitle } from '@/components/ui/Card';
import type { BoardPage } from '@/lib/db/types';
import { createClient } from '@/lib/supabase/server';
import { listBoards } from '@/lib/queries/boards';

// The foot of a page: the boards linked to it, and nothing at all when there
// are none — a page with no boards should not carry an empty shelf for them.
export async function BoardsFooter({ page }: { page: BoardPage }) {
  const supabase = await createClient();
  const boards = await listBoards(supabase, { page }).catch(() => []);
  if (boards.length === 0) return null;

  return (
    <section className="pt-6">
      <CardTitle className="mb-2 flex items-center gap-1.5">
        <Waypoints className="h-3 w-3" />
        Boards
      </CardTitle>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {boards.map(({ board, nodes, done }) => (
          <Link
            key={board.id}
            href={`/boards/${board.id}`}
            className="group flex items-baseline gap-2 py-1.5 text-sm"
          >
            <span className="transition-colors group-hover:text-accent">{board.name}</span>
            <span className="label nums text-[10px] text-muted">
              {done}/{nodes}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
