'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-8 w-8 text-muted" />
      <div>
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-muted">
          {error.digest ? `Error ID: ${error.digest}` : 'An unexpected error occurred.'}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => unstable_retry()}>
        Try again
      </Button>
    </div>
  );
}
