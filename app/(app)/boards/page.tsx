import { createClient } from '@/lib/supabase/server';
import { listBoards } from '@/lib/queries/boards';
import { BoardsList } from '@/features/boards/BoardsList';

export default async function BoardsPage() {
  const supabase = await createClient();
  const boards = await listBoards(supabase).catch(() => []);

  return (
    <div className="space-y-4">
      <BoardsList boards={boards} />
    </div>
  );
}
