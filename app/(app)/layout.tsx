import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/layout/AppShell';

// Wraps all authenticated pages. Middleware already gates access; this is a
// server-side belt-and-suspenders check that also makes `user` available later.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
