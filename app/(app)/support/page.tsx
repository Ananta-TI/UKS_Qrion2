import { AppShell } from '@/components/layout/app-shell';
import { SupportCenter } from '@/components/support/support-center';
import { getSessionProfile } from '@/lib/auth';

export default async function SupportPage() {
  const { supabase, profile } = await getSessionProfile();

  let schoolName = 'Sekolah Anda';
  let adminEmail: string | null = null;

  if (profile?.school_id) {
    const [{ data: school }, { data: admin }] = await Promise.all([
      supabase.from('schools').select('name').eq('id', profile.school_id).maybeSingle(),
      supabase
        .from('profiles')
        .select('email')
        .eq('school_id', profile.school_id)
        .eq('role', 'school_admin')
        .limit(1)
        .maybeSingle(),
    ]);

    schoolName = school?.name ?? schoolName;
    adminEmail = admin?.email ?? null;
  }

  const fullName = profile?.full_name ?? profile?.email ?? '';
  const firstName = fullName.split(/[\s@]+/)[0] || 'Sobat UKS';

  return (
    <AppShell title="Pusat Bantuan">
      <SupportCenter firstName={firstName} schoolName={schoolName} adminEmail={adminEmail} />
    </AppShell>
  );
}
