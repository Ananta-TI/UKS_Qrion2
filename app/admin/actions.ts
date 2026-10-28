'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/activity';

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'super_admin') redirect('/');

  return { supabase, user, profile };
}

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
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

export async function createSchool(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const address = String(formData.get('address') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const slugInput = String(formData.get('slug') ?? '').trim();

  if (name.length < 2) fail('/admin/schools/new', 'Nama sekolah minimal 2 karakter.');
  if (!email.includes('@')) fail('/admin/schools/new', 'Email admin tidak valid.');
  if (password.length < 8) fail('/admin/schools/new', 'Password minimal 8 karakter.');

  const { supabase, user, profile } = await requireSuperAdmin();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail('/admin/schools/new', (e as Error).message);
  }

  const slug = slugInput || slugify(name) || `sekolah-${Date.now()}`;

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .insert({ name, slug, address, phone })
    .select('id')
    .single();

  if (schoolError || !school) {
    fail('/admin/schools/new', schoolError?.message ?? 'Gagal membuat sekolah.');
  }

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `${name} — Admin`,
      role: 'school_admin',
      school_id: school.id,
    },
  });

  if (userError || !created.user) {
    await supabase.from('schools').delete().eq('id', school.id);
    fail('/admin/schools/new', userError?.message ?? 'Gagal membuat akun admin sekolah.');
  }

  await admin
    .from('profiles')
    .update({ school_id: school.id, role: 'school_admin', email, full_name: `${name} — Admin` })
    .eq('id', created.user.id);

  await logActivity({
    schoolId: school.id,
    actorId: user.id,
    actorName: profile?.full_name ?? user.email,
    action: 'create',
    entity: 'school',
    entityId: school.id,
    summary: `Membuat sekolah ${name} dan akun admin ${email}`,
    metadata: { slug, address, phone },
  });

  revalidatePath('/admin');
  redirect('/admin?ok=' + encodeURIComponent(`Sekolah ${name} dan akun ${email} berhasil dibuat.`));
}

export async function createSchoolAccount(formData: FormData) {
  const schoolId = String(formData.get('school_id') ?? '');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!schoolId) fail('/admin', 'ID sekolah tidak valid.');
  if (!email.includes('@')) fail(`/admin/schools/${schoolId}`, 'Email admin tidak valid.');
  if (password.length < 8) fail(`/admin/schools/${schoolId}`, 'Password minimal 8 karakter.');

  const { supabase, user, profile } = await requireSuperAdmin();

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', schoolId)
    .maybeSingle();

  if (!school) fail('/admin', 'Sekolah tidak ditemukan.');

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('role', 'school_admin')
    .limit(1)
    .maybeSingle();

  if (existing) fail(`/admin/schools/${schoolId}`, 'Sekolah ini sudah punya akun admin.');

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail(`/admin/schools/${schoolId}`, (e as Error).message);
  }

  const fullName = `${school.name} — Admin`;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: 'school_admin', school_id: schoolId },
  });

  if (error || !created.user) {
    fail(`/admin/schools/${schoolId}`, error?.message ?? 'Gagal membuat akun admin sekolah.');
  }

  await admin
    .from('profiles')
    .update({ email, role: 'school_admin', school_id: schoolId, full_name: fullName })
    .eq('id', created.user.id);

  await logActivity({
    schoolId,
    actorId: user.id,
    actorName: profile?.full_name ?? user.email,
    action: 'create',
    entity: 'user',
    entityId: created.user.id,
    summary: `Membuat akun admin ${email} untuk ${school.name}`,
    metadata: { role: 'school_admin' },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/schools/${schoolId}`);
  redirect(`/admin/schools/${schoolId}?ok=` + encodeURIComponent(`Akun ${email} berhasil dibuat.`));
}

export async function updateSchool(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim() || null;
  const address = String(formData.get('address') ?? '').trim() || null;
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const isActive = formData.get('is_active') === 'on';

  if (!id) fail('/admin', 'ID sekolah tidak valid.');
  if (name.length < 2) fail(`/admin/schools/${id}`, 'Nama sekolah minimal 2 karakter.');

  const { supabase, user, profile } = await requireSuperAdmin();

  const { error } = await supabase
    .from('schools')
    .update({ name, slug, address, phone, is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) fail(`/admin/schools/${id}`, error.message);

  await logActivity({
    schoolId: id,
    actorId: user.id,
    actorName: profile?.full_name ?? user.email,
    action: 'update',
    entity: 'school',
    entityId: id,
    summary: `Memperbarui data sekolah ${name}`,
    metadata: { slug, address, phone, is_active: isActive },
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/schools/${id}`);
  redirect(`/admin/schools/${id}?ok=` + encodeURIComponent('Perubahan disimpan.'));
}

export async function resetPassword(formData: FormData) {
  const schoolId = String(formData.get('school_id') ?? '');
  const password = String(formData.get('password') ?? '');

  if (password.length < 8) fail(`/admin/schools/${schoolId}`, 'Password minimal 8 karakter.');

  const { supabase, user, profile } = await requireSuperAdmin();

  const { data: account } = await supabase
    .from('profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('role', 'school_admin')
    .limit(1)
    .maybeSingle();

  if (!account) fail(`/admin/schools/${schoolId}`, 'Akun sekolah tidak ditemukan.');

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail(`/admin/schools/${schoolId}`, (e as Error).message);
  }

  const { error } = await admin.auth.admin.updateUserById(account.id, { password });
  if (error) fail(`/admin/schools/${schoolId}`, error.message);

  await logActivity({
    schoolId,
    actorId: user.id,
    actorName: profile?.full_name ?? user.email,
    action: 'update',
    entity: 'user',
    entityId: account.id,
    summary: 'Mereset password akun admin sekolah',
  });

  redirect(`/admin/schools/${schoolId}?ok=` + encodeURIComponent('Password akun sekolah diperbarui.'));
}

export async function seedDefaultMedicines(formData: FormData) {
  const schoolId = String(formData.get('school_id') ?? '');
  if (!schoolId) fail('/admin', 'ID sekolah tidak valid.');

  const { supabase, user, profile } = await requireSuperAdmin();

  const { data: school } = await supabase
    .from('schools')
    .select('name')
    .eq('id', schoolId)
    .maybeSingle();

  if (!school) fail('/admin', 'Sekolah tidak ditemukan.');

  const { data, error } = await supabase.rpc('seed_default_medicines', { p_school: schoolId });

  if (error) {
    fail(
      `/admin/schools/${schoolId}`,
      `Gagal mengisi obat bawaan: ${error.message}. Pastikan migrasi 005 sudah dijalankan.`
    );
  }

  const inserted = (data as number | null) ?? 0;

  await logActivity({
    schoolId,
    actorId: user.id,
    actorName: profile?.full_name ?? user.email,
    action: 'create',
    entity: 'medicine',
    summary:
      inserted > 0
        ? `Mengisi ${inserted} obat bawaan untuk ${school.name}`
        : `Obat bawaan ${school.name} sudah ada, tidak ada yang ditambahkan`,
    metadata: { inserted },
  });

  revalidatePath(`/admin/schools/${schoolId}`);
  revalidatePath('/admin');
  redirect(
    `/admin/schools/${schoolId}?ok=` +
      encodeURIComponent(
        inserted > 0
          ? `${inserted} obat bawaan berhasil ditambahkan.`
          : 'Sekolah ini sudah memiliki daftar obat.'
      )
  );
}

export async function deleteSchool(formData: FormData) {
  const schoolId = String(formData.get('school_id') ?? '');
  if (!schoolId) fail('/admin', 'ID sekolah tidak valid.');

  const { supabase } = await requireSuperAdmin();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail(`/admin/schools/${schoolId}`, (e as Error).message);
  }

  const { data: profiles } = await supabase.from('profiles').select('id').eq('school_id', schoolId);

  await supabase.from('profiles').delete().eq('school_id', schoolId);
  for (const p of profiles ?? []) {
    await admin.auth.admin.deleteUser(p.id);
  }

  const { error } = await supabase.from('schools').delete().eq('id', schoolId);
  if (error) fail(`/admin/schools/${schoolId}`, error.message);

  revalidatePath('/admin');
  redirect('/admin?ok=' + encodeURIComponent('Sekolah beserta seluruh datanya berhasil dihapus.'));
}

export async function impersonateSchool(formData: FormData) {
  const schoolId = String(formData.get('school_id') ?? '');
  const { supabase, user, profile } = await requireSuperAdmin();

  const { data: account } = await supabase
    .from('profiles')
    .select('email')
    .eq('school_id', schoolId)
    .eq('role', 'school_admin')
    .limit(1)
    .maybeSingle();

  if (!account?.email) fail('/admin', 'Akun sekolah tidak ditemukan untuk sekolah ini.');

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    fail('/admin', (e as Error).message);
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: account.email,
  });

  const token = data?.properties?.hashed_token;
  if (error || !token) fail('/admin', error?.message ?? 'Gagal membuat tautan login.');

  await logActivity({
    schoolId,
    actorId: user.id,
    actorName: profile?.full_name ?? user.email,
    action: 'impersonate',
    entity: 'user',
    summary: `Masuk sebagai admin sekolah ${account.email}`,
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: token,
  });

  if (verifyError) fail('/admin', `Gagal login sebagai sekolah: ${verifyError.message}`);

  revalidatePath('/', 'layout');
  redirect('/');
}
