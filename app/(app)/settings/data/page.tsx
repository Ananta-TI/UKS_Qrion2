import { redirect } from 'next/navigation';
import { getSessionProfile, profileSchool } from '@/lib/auth';
import { SettingsShell } from '@/components/settings/settings-shell';
import { DataPanel } from './data-panel';

export default async function SettingsDataPage() {
  const { profile } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/auth/signout?reason=inactive');

  const school = profileSchool(profile);
  if (!school) redirect('/');

  return (
    <SettingsShell
      actions={
        <span className="spill spill--iris">
          <i />
          Milik sekolah Anda
        </span>
      }
    >
      <DataPanel schoolId={school.id} schoolName={school.name} />
    </SettingsShell>
  );
}
