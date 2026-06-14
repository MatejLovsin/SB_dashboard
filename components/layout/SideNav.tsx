'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems, isActive } from './nav-items';

// Desktop sidebar. Hidden below md (BottomNav takes over).
export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-52 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
      <div className="px-4 py-4">
        <span className="text-lg font-semibold tracking-tight">Dashboard</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="relative">
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-full bg-accent transition-all duration-200 ${active ? 'h-5 opacity-100' : 'h-0 opacity-0'}`}
                />
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
