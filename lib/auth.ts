import { createClient } from '@/lib/supabase/server';

export type SessionProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'super_admin' | 'school_admin' | 'staff';
  school_id: string | null;
};

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null as SessionProfile | null };
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, user, profile: (data as SessionProfile | null) ?? null };
}
