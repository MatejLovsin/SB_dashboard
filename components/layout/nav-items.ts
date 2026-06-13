import { Home, Dumbbell, GraduationCap, Briefcase, type LucideIcon } from 'lucide-react';

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
];

// Active when the pathname equals the href, or is nested under a section href.
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
