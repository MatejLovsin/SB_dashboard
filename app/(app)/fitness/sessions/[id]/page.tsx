import { SessionEditor } from '@/features/fitness/SessionEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SessionEditorPage({ params }: Props) {
  const { id } = await params;
  return <SessionEditor sessionId={id} />;
}
