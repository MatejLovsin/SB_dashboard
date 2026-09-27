import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBoard } from '@/lib/queries/boards';
import { BoardEditor } from '@/features/boards/BoardEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const contents = await getBoard(supabase, id);
  if (!contents) notFound();

  return <BoardEditor contents={contents} />;
}
