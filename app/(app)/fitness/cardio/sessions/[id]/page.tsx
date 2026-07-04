import { CardioSessionEditor } from '@/features/fitness/CardioSessionEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CardioSessionEditorPage({ params }: Props) {
  const { id } = await params;
  return <CardioSessionEditor sessionId={id} />;
}
