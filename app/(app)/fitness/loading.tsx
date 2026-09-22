import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonHeader, SkeletonRows, SkeletonTiles } from '@/components/ui/Skeleton';

// The hub: header, stat row, then the programme and plan rails.
export default function Loading() {
  return (
    <LoadingScreen section="fitness">
      <div className="space-y-8">
        <SkeletonHeader />
        <SkeletonTiles />
        <SkeletonRows rows={3} />
      </div>
    </LoadingScreen>
  );
}
