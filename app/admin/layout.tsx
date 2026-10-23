import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (profile.role !== 'super_admin') redirect('/');

  return <AdminShell email={profile.email ?? ''}>{children}</AdminShell>;
}
