import { cache } from 'react';
import { cookies } from 'next/headers';
import { getAuthUser } from '@/lib/auth';
import {
  defaultPreferences,
  readPreferences,
  sanitizePreferences,
  type UserPreferences,
} from '@/lib/user-prefs';

export const PREFS_COOKIE = 'uks_ui_prefs';

type StoredPreferences = {
  uid: string;
  prefs: UserPreferences;
};

/**
 * Preferensi milik akun yang sedang login. Cookie menyimpan salinan terbaru
 * setelah user mengubah tampilan, sedangkan metadata user menjadi fallback
 * saat login di perangkat/browser baru. UID di dalam cookie mencegah
 * preferensi satu akun terbaca oleh akun lain di browser yang sama.
 */
export const getPreferences = cache(async (): Promise<UserPreferences> => {
  const { user } = await getAuthUser();
  if (!user) return { ...defaultPreferences };

  const raw = (await cookies()).get(PREFS_COOKIE)?.value;

  if (raw) {
    try {
      const stored = JSON.parse(raw) as Partial<StoredPreferences>;
      if (stored.uid === user.id && stored.prefs) {
        return sanitizePreferences(stored.prefs);
      }
    } catch {
      // Cookie rusak/format lama: pakai metadata akun.
    }
  }

  return readPreferences(user.user_metadata);
});
