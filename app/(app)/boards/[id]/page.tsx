import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBoard } from '@/lib/queries/boards';
import { signImages } from '@/lib/queries/boardImages';
import { listGoalOptions } from '@/lib/queries/boardGoals';
import { BoardEditor } from '@/features/boards/BoardEditor';
import { loadBoardGoals, NO_GOALS } from '@/features/boards/boardGoals';

interface Props {
  params: Promise<{ id: string }>;
}

const logged = <T,>(fallback: T) => (e: unknown): T => {
  console.error(e);
  return fallback;
};

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  // The picker's list needs nothing from the board, so it starts first.
  const options = listGoalOptions(supabase).catch(logged([]));
  const contents = await getBoard(supabase, id);
  if (!contents) notFound();

  // Not awaited: the canvas paints without goal progress and the glow follows
  // on the stream. Only goals this board links to are resolved — any status,
  // since a link to an achieved goal must still light up.
  const goals = loadBoardGoals(supabase, contents, options).catch(logged(NO_GOALS));

  // The bucket is private: sign every image on the board in one call.
  const paths = contents.nodes.flatMap((n) => (n.image_path ? [n.image_path] : []));
  const images = await signImages(supabase, paths).catch(logged<Record<string, string>>({}));

  return <BoardEditor contents={contents} goals={goals} images={images} />;
}
