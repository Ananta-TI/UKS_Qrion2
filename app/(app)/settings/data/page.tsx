import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { SettingsShell } from '@/components/settings/settings-shell';
import { DataPanel } from './data-panel';

export default async function SettingsDataPage() {
  const { profile, supabase } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/admin');

  const { data: school } = await supabase
    .from('schools')
    .select('id,name')
    .eq('id', profile.school_id)
    .maybeSingle();

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
