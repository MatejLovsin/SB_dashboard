import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';

// Authenticated app frame: sidebar (desktop) + top bar + bottom tabs (mobile).
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {/* pb leaves room for the fixed mobile bottom nav */}
        <main className="flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-8">
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
