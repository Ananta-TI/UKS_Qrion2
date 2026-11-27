import { redirect } from 'next/navigation';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getSessionProfile, profileSchool } from '@/lib/auth';
import { SettingsShell } from '@/components/settings/settings-shell';
import { CompanyForm } from './company-form';
import { PersonalForm } from './personal-form';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { profile, user } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/auth/signout?reason=inactive');

  const school = profileSchool(profile);
  if (!school) redirect('/');

  const params = await searchParams;

  return (
    <SettingsShell>
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

        {/* Kunci dipakai untuk me-reset form saat data dari server berubah.
            Nilainya diberi awalan berbeda supaya tidak pernah bentrok walau
            data sekolah dan data akun kebetulan sama. */}
        <CompanyForm
          key={`company:${school.slug ?? 'no-slug'}`}
          school={school}
          email={profile.email ?? user?.email ?? ''}
        />

        <PersonalForm
          key={`personal:${profile.full_name ?? 'no-name'}`}
          fullName={profile.full_name ?? ''}
          email={profile.email ?? user?.email ?? ''}
        />
      </div>
      <p className="set-hint">
        <ShieldCheck className="ico" />
        Perubahan hanya berlaku untuk sekolah Anda. Data antar sekolah tidak pernah tercampur.
      </p>
    </SettingsShell>
  );
}
