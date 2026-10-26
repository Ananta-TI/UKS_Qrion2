import { AppShell } from '@/components/layout/app-shell';
import { SupportCenter } from '@/components/support/support-center';
import { getSessionProfile, profileSchool } from '@/lib/auth';

export default async function SupportPage() {
  const { supabase, profile } = await getSessionProfile();
  const school = profileSchool(profile);

  let adminEmail: string | null = null;

  if (profile?.school_id) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('email')
      .eq('school_id', profile.school_id)
      .eq('role', 'school_admin')
      .limit(1)
      .maybeSingle();

    adminEmail = admin?.email ?? null;
  }

  const fullName = profile?.full_name ?? profile?.email ?? '';
  const firstName = fullName.split(/[\s@]+/)[0] || 'Sobat UKS';

  return (
    <AppShell title="Pusat Bantuan">
      <SupportCenter
        firstName={firstName}
        schoolName={school?.name ?? 'Sekolah Anda'}
        adminEmail={adminEmail}
      />
    </AppShell>
  );
}
