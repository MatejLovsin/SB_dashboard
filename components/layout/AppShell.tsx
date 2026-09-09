'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { sectionTheme } from './nav-items';

/** Glow strength at the very bottom of a page, as a fraction of full. */
const SCROLL_FADE_FLOOR = 0.2;

// Authenticated app frame: sidebar (desktop) + top bar + bottom tabs (mobile).
// `data-theme` (derived from the route) recolors accent/chart tokens for the
// whole frame — see the [data-theme] blocks in app/globals.css.
//
// `data-scope` sets how bright the lamp burns: hub pages (/, /fitness, /school,
// /work) carry a lot at a glance and get the full glow; subpages are denser and
// read for longer, so they get it dialled back. Both values live in globals.css.
//
// The lamp is fixed to the viewport, so it would otherwise ride along at full
// strength forever. `--scroll-fade` dims it as you descend: 1 at the top of a
// page, 0.2 at the bottom, linear in between. Multiplied into the glow's opacity
// in globals.css.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = sectionTheme(pathname);
  const scope = pathname.split('/').filter(Boolean).length <= 1 ? 'hub' : 'sub';
  const shellRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Also mirror the theme onto <html> so portaled overlays (FocusOverlay
  // renders into document.body, outside this wrapper) still pick up the
  // section's accent/chart colors instead of falling back to the default.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-scope', scope);
  }, [theme, scope]);

  // Dim the lamp on the way down. Writes a CSS var straight to the DOM (no
  // React state) and coalesces to one write per frame, so scrolling stays cheap.
  // Re-runs on route change; a ResizeObserver keeps it honest when a page grows
  // after mount (async data, client-rendered charts).
  useEffect(() => {
    const main = mainRef.current;
    const shell = shellRef.current;
    const page = pageRef.current;
    if (!main || !shell) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = main.scrollHeight - main.clientHeight;
      // A page that doesn't scroll stays fully lit.
      const progress = scrollable > 0 ? Math.min(1, main.scrollTop / scrollable) : 0;
      shell.style.setProperty(
        '--scroll-fade',
        String(1 - (1 - SCROLL_FADE_FLOOR) * progress),
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    // Next resets the container's scroll on navigation, which can land after
    // this effect runs — re-read on the next frame so a new page opens fully lit.
    const settle = requestAnimationFrame(update);
    main.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = page ? new ResizeObserver(schedule) : null;
    if (observer && page) observer.observe(page);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      cancelAnimationFrame(settle);
      main.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [pathname]);

  return (
    <div
      ref={shellRef}
      className="flex h-dvh overflow-hidden"
      data-theme={theme}
      data-scope={scope}
    >
      <div className="section-glow" aria-hidden />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/* pb leaves room for the fixed mobile bottom nav */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-8 md:pb-8">
          {/* page-lit lights the page's top-level sections by their distance
              from the lamp — see the .page-lit block in globals.css. */}
          <div ref={pageRef} className="page-lit mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
