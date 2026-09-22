import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonChart, SkeletonHeader, SkeletonTiles } from '@/components/ui/Skeleton';

// Overview leads with the hero trend chart.
export default function Loading() {
  return (
    <LoadingScreen section="fitness">
      <div className="space-y-8">
        <SkeletonHeader />
        <SkeletonChart />
        <SkeletonTiles />
      </div>
    </LoadingScreen>
  );
}
