import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';

// Wraps all authenticated pages. The proxy already gates access; this is a
// server-side belt-and-suspenders check. getClaims verifies the JWT locally, so
// unlike getUser() it adds no Auth round trip to every page.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
