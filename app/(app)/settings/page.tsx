import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getSessionProfile, profileSchool } from '@/lib/auth';
import { SettingsShell } from '@/components/settings/settings-shell';
import { CompanyForm } from './company-form';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { profile, user } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/admin');

  const school = profileSchool(profile);
  if (!school) redirect('/');

  const params = await searchParams;
  const canEdit = profile.role === 'school_admin';

  return (
    <SettingsShell
      actions={
        <span className={canEdit ? 'spill spill--iris' : 'spill'}>
          <i />
          {canEdit ? 'Admin sekolah' : 'Hanya lihat'}
        </span>
      }
    >
      <CompanyForm
        school={school}
        email={profile.email ?? user?.email ?? ''}
        canEdit={canEdit}
        ok={params.ok}
        error={params.error}
      />
      <p className="set-hint">
        <ShieldCheck className="ico" />
        Perubahan hanya berlaku untuk sekolah Anda. Data antar sekolah tidak pernah tercampur.
      </p>
    </SettingsShell>
  );
}
