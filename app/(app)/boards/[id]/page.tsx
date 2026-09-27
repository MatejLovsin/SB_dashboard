import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBoard } from '@/lib/queries/boards';
import { listResolvedGoals } from '@/lib/queries/goals';
import { BoardEditor } from '@/features/boards/BoardEditor';
import type { BoardGoals } from '@/features/boards/boardContext';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [contents, resolved] = await Promise.all([
    getBoard(supabase, id),
    // `{}` is every status: a link to an achieved goal must still light up.
    // Goals are resolved here, on the server, for the same reason /goals does.
    listResolvedGoals(supabase, {}).catch((e: unknown) => {
      console.error(e);
      return [];
    }),
  ]);
  if (!contents) notFound();

  const goals: BoardGoals = {
    states: Object.fromEntries(
      resolved.map((r) => [
        r.goal.id,
        { title: r.goal.title, percent: r.percent, achieved: r.achieved },
      ]),
    ),
    options: resolved
      .filter((r) => r.goal.status === 'active')
      .map((r) => ({ id: r.goal.id, title: r.goal.title, section: r.goal.section })),
  };

  return <BoardEditor contents={contents} goals={goals} />;
}
