'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { readPreferences, sanitizePreferences, type UserPreferences } from '@/lib/user-prefs';

/**
 * Simpan preferensi tampilan ke akun yang sedang login saja.
 * Metadata user lain tidak tersentuh.
 */
export async function savePreferences(
  patch: Partial<UserPreferences>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: 'Sesi berakhir. Silakan masuk lagi.' };

  const next = sanitizePreferences({ ...readPreferences(user.user_metadata), ...patch });

  const { error } = await supabase.auth.updateUser({ data: { ui_prefs: next } });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/', 'layout');
  return { ok: true };
}
