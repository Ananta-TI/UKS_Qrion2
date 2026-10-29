import { redirect } from 'next/navigation';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getSessionProfile, profileSchool } from '@/lib/auth';
import { SettingsShell } from '@/components/settings/settings-shell';
import { CompanyForm } from './company-form';
import { PersonalForm } from './personal-form';

const roleLabel: Record<string, string> = {
  super_admin: 'Super admin',
  school_admin: 'Admin sekolah',
  staff: 'Staf UKS',
};

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
          {roleLabel[profile.role] ?? 'Hanya lihat'}
        </span>
      }
    >
      <div className="set-stack">
        {params.ok && (
          <div className="note note--ok">
            <CheckCircle2 className="ico" />
            <span>{params.ok}</span>
          </div>
        )}
        {params.error && (
          <div className="note note--bad">
            <AlertCircle className="ico" />
            <span>{params.error}</span>
          </div>
        )}

        <CompanyForm
          key={school.slug ?? 'no-slug'}
          school={school}
          email={profile.email ?? user?.email ?? ''}
          canEdit={canEdit}
        />

        <PersonalForm
          key={profile.full_name ?? 'no-name'}
          fullName={profile.full_name ?? ''}
          email={profile.email ?? user?.email ?? ''}
          role={roleLabel[profile.role] ?? profile.role}
        />
      </div>
      <p className="set-hint">
        <ShieldCheck className="ico" />
        Perubahan hanya berlaku untuk sekolah Anda. Data antar sekolah tidak pernah tercampur.
      </p>
    </SettingsShell>
  );
}
