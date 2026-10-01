import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SkeletonHeader } from '@/components/ui/Skeleton';

// A board: its name, then the canvas filling the rest of the screen.
export default function Loading() {
  return (
    <LoadingScreen>
      <div className="space-y-3">
        <SkeletonHeader />
        <div
          className="h-[calc(100dvh-15rem)] min-h-[420px] rounded bg-card-2 md:h-[calc(100dvh-13rem)]"
          aria-hidden="true"
        />
      </div>
    </LoadingScreen>
  );
}
