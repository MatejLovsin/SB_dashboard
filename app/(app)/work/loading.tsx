import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonChart, SkeletonHeader, SkeletonRows, SkeletonTiles } from '@/components/ui/Skeleton';

// The hub: header, stat row, metric charts, then the kanban.
export default function Loading() {
  return (
    <LoadingScreen section="work">
      <div className="space-y-8">
        <SkeletonHeader />
        <SkeletonTiles />
        <SkeletonChart />
        <SkeletonRows rows={4} />
      </div>
    </LoadingScreen>
  );
}
