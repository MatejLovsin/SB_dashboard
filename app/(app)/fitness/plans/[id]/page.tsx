import { PlanEditor } from '@/features/fitness/PlanEditor';

// `params` is a Promise in Next 16 — await it before reading the segment.
export default async function PlanEditorPage({ params }: PageProps<'/fitness/plans/[id]'>) {
  const { id } = await params;
  return <PlanEditor planId={id} />;
}
