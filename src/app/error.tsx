'use client';

import { useEffect } from 'react';
import { BUSINESS } from '@/lib/business';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-xl font-black text-[var(--foreground)]">Something went wrong</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Please try again. If it keeps happening, call us at {BUSINESS.phoneDisplay}.
        </p>
        <button onClick={reset} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold">
          Try again
        </button>
      </div>
    </div>
  );
}
