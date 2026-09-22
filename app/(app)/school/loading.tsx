import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonChart, SkeletonHeader, SkeletonRows, SkeletonTiles } from '@/components/ui/Skeleton';

// The hub: header, stat row, subject charts, upcoming exams.
export default function Loading() {
  return (
    <LoadingScreen section="school">
      <div className="space-y-8">
        <SkeletonHeader />
        <SkeletonTiles />
        <SkeletonChart />
        <SkeletonRows rows={3} />
      </div>
    </LoadingScreen>
  );
}
