import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonRows, SkeletonTiles } from '@/components/ui/Skeleton';

// Home: the three section tiles, then the todo dashboard.
export default function Loading() {
  return (
    <LoadingScreen>
      <div className="space-y-8">
        <SkeletonTiles />
        <SkeletonRows rows={4} />
      </div>
    </LoadingScreen>
  );
}
