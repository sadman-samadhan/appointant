import Link from 'next/link';
import { BUSINESS } from '@/lib/business';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
      <div className="max-w-sm text-center space-y-4">
        <p className="text-5xl font-black text-[var(--primary)]">404</p>
        <h1 className="text-xl font-black text-[var(--foreground)]">This page doesn’t exist</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          The link may be old. You can book from the home page or call us at {BUSINESS.phoneDisplay}.
        </p>
        <Link href="/" className="btn-primary inline-block px-5 py-2.5 rounded-xl text-sm font-bold">
          Go to home page
        </Link>
      </div>
    </div>
  );
}
