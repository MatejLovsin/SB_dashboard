import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonHeader, SkeletonRows } from '@/components/ui/Skeleton';

// The exercise library: a long list, nothing else.
export default function Loading() {
  return (
    <LoadingScreen section="fitness">
      <div className="space-y-8">
        <SkeletonHeader />
        <SkeletonRows rows={6} />
      </div>
    </LoadingScreen>
  );
}
