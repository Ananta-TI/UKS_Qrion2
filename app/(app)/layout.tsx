import { redirect } from 'next/navigation';
import { AppFrame } from '@/components/layout/app-frame';
import { getSessionProfile, schoolIsActive } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (profile.role === 'super_admin') redirect('/admin');
  if (!schoolIsActive(profile)) redirect('/auth/signout?reason=inactive');

  return <AppFrame>{children}</AppFrame>;
}
