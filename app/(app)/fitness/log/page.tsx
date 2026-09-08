import { Suspense } from 'react';
import { SessionRunner } from '@/features/fitness/SessionRunner';

// SessionRunner reads `?plan=<id>` via useSearchParams to auto-start a plan, which
// Next requires a Suspense boundary for.
export default function LogWorkoutPage() {
  return (
    <Suspense fallback={null}>
      <SessionRunner />
    </Suspense>
  );
}
