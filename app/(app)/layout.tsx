import { redirect } from 'next/navigation';
import { AppFrame } from '@/components/layout/app-frame';
import { getSessionProfile, profileSchool, schoolIsActive } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (profile.role === 'super_admin') redirect('/admin');
  if (!schoolIsActive(profile)) redirect('/auth/signout?reason=inactive');

  const school = profileSchool(profile);
  const name = profile.full_name?.trim() || profile.email || 'Petugas UKS';
  const role = profile.role === 'school_admin' ? 'Admin sekolah' : 'Petugas UKS';

  return (
    <AppFrame user={{ name, role, school: school?.name ?? null }}>{children}</AppFrame>
  );
}
