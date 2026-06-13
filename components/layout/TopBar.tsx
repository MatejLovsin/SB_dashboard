'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { navItems, isActive } from './nav-items';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const current = navItems.find((item) => isActive(pathname, item.href));
  const title = current?.label ?? 'Dashboard';

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="safe-top sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        className="rounded-lg p-2 text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
