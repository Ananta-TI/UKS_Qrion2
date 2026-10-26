'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/auth';
import { getPreferences, PREFS_COOKIE } from '@/lib/preferences';
import { sanitizePreferences, type UserPreferences } from '@/lib/user-prefs';

/**
 * Simpan preferensi tampilan ke akun yang sedang login saja.
 * Metadata user tetap menjadi sumber utama; cookie account-scoped membuat
 * perubahan langsung terbaca di server tanpa menunggu refresh JWT.
 */
export async function savePreferences(
  patch: Partial<UserPreferences>
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getAuthUser();

  if (!user) return { ok: false, error: 'Sesi berakhir. Silakan masuk lagi.' };

  const next = sanitizePreferences({ ...(await getPreferences()), ...patch });

  const { error } = await supabase.auth.updateUser({ data: { ui_prefs: next } });
  if (error) return { ok: false, error: error.message };

  const cookieStore = await cookies();
  cookieStore.set(PREFS_COOKIE, JSON.stringify({ uid: user.id, prefs: next }), {
    path: '/',
    maxAge: 400 * 24 * 60 * 60,
    sameSite: 'lax',
    httpOnly: true,
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}
