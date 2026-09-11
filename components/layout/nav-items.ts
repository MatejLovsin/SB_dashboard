import { Home, Dumbbell, GraduationCap, Briefcase, Target, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/fitness', label: 'Fitness', icon: Dumbbell },
  { href: '/school', label: 'School', icon: GraduationCap },
  { href: '/work', label: 'Work', icon: Briefcase },
  { href: '/goals', label: 'Goals', icon: Target },
];

// Active when the pathname equals the href, or is nested under a section href.
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type SectionTheme = 'home' | 'fitness' | 'school' | 'work';

// Maps a pathname to its color theme. Dashboard-only routes with no SideNav
// entry (journal, todos) fall under 'home' — and so does /goals, whose cards each
// carry their own section theme instead of the page picking one.
export function sectionTheme(pathname: string): SectionTheme {
  if (pathname.startsWith('/fitness')) return 'fitness';
  if (pathname.startsWith('/school')) return 'school';
  if (pathname.startsWith('/work')) return 'work';
  return 'home';
}
