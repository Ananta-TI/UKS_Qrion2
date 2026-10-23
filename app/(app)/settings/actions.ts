'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';

function fail(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

export async function updateCompanyProfile(formData: FormData) {
  const { profile, user } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/admin');

  if (profile.role !== 'school_admin') {
    fail('Hanya admin sekolah yang dapat mengubah profil.');
  }

  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const address = String(formData.get('address') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;

  if (name.length < 2) fail('Nama sekolah minimal 2 karakter.');
  if (name.length > 120) fail('Nama sekolah maksimal 120 karakter.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email login tidak valid.');
  if (phone && phone.length > 40) fail('Nomor telepon terlalu panjang.');
  if (address && address.length > 240) fail('Alamat maksimal 240 karakter.');

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail((e as Error).message);
  }

  const currentEmail = (profile.email ?? user?.email ?? '').toLowerCase();
  const emailChanged = email !== currentEmail;

  if (emailChanged) {
    const { error: authError } = await admin.auth.admin.updateUserById(profile.id, {
      email,
      email_confirm: true,
    });

    if (authError) fail(`Gagal memperbarui email login: ${authError.message}`);

    const { error: profileError } = await admin.from('profiles').update({ email }).eq('id', profile.id);
    if (profileError) fail(`Email login diperbarui, tetapi profil gagal disinkronkan: ${profileError.message}`);
  } else if (!profile.email) {
    await admin.from('profiles').update({ email }).eq('id', profile.id);
  }

  const { error } = await admin
    .from('schools')
    .update({ name, address, phone })
    .eq('id', profile.school_id);

  if (error) fail(`Gagal menyimpan profil: ${error.message}`);

  await logActivity({
    schoolId: profile.school_id,
    actorId: profile.id,
    actorName: profile.full_name ?? profile.email ?? user?.email,
    action: 'update',
    entity: 'school',
    entityId: profile.school_id,
    summary: emailChanged
      ? `Memperbarui profil sekolah dan email login menjadi ${email}`
      : 'Memperbarui profil sekolah',
    metadata: {
      name,
      address,
      phone,
      email_changed: emailChanged,
      ...(emailChanged ? { previous_email: currentEmail || null } : {}),
    },
  });

  revalidatePath('/settings');
  revalidatePath('/settings/users');
  revalidatePath('/');
  redirect(
    `/settings?ok=${encodeURIComponent(
      emailChanged
        ? 'Profil sekolah disimpan. Email login diperbarui — gunakan email baru pada login berikutnya.'
        : 'Profil sekolah berhasil disimpan.'
    )}`
  );
}
