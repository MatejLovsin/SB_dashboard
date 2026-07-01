'use client';

import { usePathname } from 'next/navigation';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { sectionTheme } from './nav-items';

// Authenticated app frame: sidebar (desktop) + top bar + bottom tabs (mobile).
// `data-theme` (derived from the route) recolors accent/chart tokens for the
// whole frame — see the [data-theme] blocks in app/globals.css.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = sectionTheme(pathname);

  return (
    <div className="flex h-dvh overflow-hidden" data-theme={theme}>
      <div className="section-glow" aria-hidden />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/* pb leaves room for the fixed mobile bottom nav */}
        <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
