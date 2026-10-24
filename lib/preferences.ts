import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { readPreferences, type UserPreferences } from '@/lib/user-prefs';

/**
 * Preferensi tampilan milik akun yang sedang login.
 * Disimpan di metadata user Supabase sehingga tidak bocor antar akun di browser yang sama.
 */
export const getPreferences = cache(async (): Promise<UserPreferences> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return readPreferences(user?.user_metadata);
});
