'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSessionProfile, profileSchool } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';

function fail(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function updateCompanyProfile(formData: FormData) {
  const { profile, user } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');
  if (!profile.school_id) redirect('/auth/signout?reason=inactive');

  if (profile.role !== 'school_admin') {
    fail('Hanya admin sekolah yang dapat mengubah profil.');
  }

  const name = String(formData.get('name') ?? '').trim();
  const slugInput = String(formData.get('slug') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const address = String(formData.get('address') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;

  if (name.length < 2) fail('Nama sekolah minimal 2 karakter.');
  if (name.length > 120) fail('Nama sekolah maksimal 120 karakter.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email login tidak valid.');
  if (phone && phone.length > 40) fail('Nomor telepon terlalu panjang.');
  if (address && address.length > 240) fail('Alamat maksimal 240 karakter.');

  // Slug: pakai isian pengguna bila ada, kalau kosong turunkan dari nama sekolah.
  const slug = slugInput ? slugify(slugInput) : slugify(name);
  if (slug.length < 3) fail('Slug sekolah minimal 3 karakter (huruf kecil, angka, tanda hubung).');
  if (slug.length > 60) fail('Slug sekolah maksimal 60 karakter.');

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail((e as Error).message);
  }

  // Cek keunikan slug lintas sekolah (kolom slug unik di tabel schools).
  const { data: slugOwner, error: slugError } = await admin
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .neq('id', profile.school_id)
    .maybeSingle();

  if (slugError) fail(`Gagal memeriksa slug: ${slugError.message}`);
  if (slugOwner) fail(`Slug "${slug}" sudah dipakai sekolah lain. Pilih slug lain.`);

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
    .update({ name, slug, address, phone })
    .eq('id', profile.school_id);

  if (error) {
    // 23505 = unique_violation (balapan saat dua admin menyimpan slug sama).
    if (error.code === '23505') {
      fail(`Slug "${slug}" baru saja dipakai sekolah lain. Pilih slug lain.`);
    }
    fail(`Gagal menyimpan profil: ${error.message}`);
  }

  const slugChanged = (profileSchool(profile)?.slug ?? '') !== slug;

  await logActivity({
    schoolId: profile.school_id,
    actorId: profile.id,
    actorName: profile.full_name ?? profile.email ?? user?.email,
    action: 'update',
    entity: 'school',
    entityId: profile.school_id,
    summary: emailChanged
      ? `Memperbarui profil sekolah dan email login menjadi ${email}`
      : slugChanged
        ? `Memperbarui profil sekolah dan slug menjadi ${slug}`
        : 'Memperbarui profil sekolah',
    metadata: {
      name,
      slug,
      address,
      phone,
      email_changed: emailChanged,
      ...(emailChanged ? { previous_email: currentEmail || null } : {}),
      ...(slugChanged ? { previous_slug: profileSchool(profile)?.slug || null } : {}),
    },
  });

  revalidatePath('/settings');
  revalidatePath('/settings/users');
  revalidatePath('/');
  redirect(
    `/settings?ok=${encodeURIComponent(
      emailChanged
        ? 'Profil sekolah disimpan. Email login diperbarui — gunakan email baru pada login berikutnya.'
        : slugChanged
          ? 'Profil sekolah dan slug berhasil disimpan.'
          : 'Profil sekolah berhasil disimpan.'
    )}`
  );
}

/**
 * Ubah nama lengkap akun sendiri. Berlaku untuk semua peran (admin sekolah
 * maupun staf) karena hanya menyentuh baris profil miliknya sendiri.
 */
export async function updateOwnProfile(formData: FormData) {
  const { profile, user } = await getSessionProfile();

  if (!profile) redirect('/auth/signin');

  const fullName = String(formData.get('full_name') ?? '').trim();

  if (fullName.length < 2) fail('Nama lengkap minimal 2 karakter.');
  if (fullName.length > 120) fail('Nama lengkap maksimal 120 karakter.');

  const previous = profile.full_name?.trim() ?? '';

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail((e as Error).message);
  }

  // RLS `profiles` tidak mengizinkan update mandiri, jadi lewat service role —
  // tetapi id selalu dikunci ke profil milik user yang login.
  const { error } = await admin.from('profiles').update({ full_name: fullName }).eq('id', profile.id);

  if (error) fail(`Gagal menyimpan nama: ${error.message}`);

  // Sinkronkan metadata auth agar nilai di JWT tidak tertinggal.
  try {
    await admin.auth.admin.updateUserById(profile.id, {
      user_metadata: { full_name: fullName },
    });
  } catch (e) {
    console.warn('[settings] gagal menyinkronkan metadata auth:', (e as Error).message);
  }

  if (profile.school_id) {
    await logActivity({
      schoolId: profile.school_id,
      actorId: profile.id,
      actorName: fullName,
      action: 'update',
      entity: 'profile',
      entityId: profile.id,
      summary:
        previous && previous !== fullName
          ? `Mengubah nama akun dari ${previous} menjadi ${fullName}`
          : 'Memperbarui nama akun',
      metadata: { previous_full_name: previous || null, full_name: fullName, email: profile.email ?? user?.email ?? null },
    });
  }

  revalidatePath('/settings');
  revalidatePath('/settings/users');
  revalidatePath('/');
  redirect(`/settings?ok=${encodeURIComponent('Nama akun berhasil diperbarui.')}`);
}
