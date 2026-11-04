import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

export type SchoolSummary = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};

export type SessionProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'school_admin' | 'staff';
  school_id: string | null;
  schools?: SchoolSummary | SchoolSummary[] | null;
};

/**
 * Identitas user diambil dari claims JWT yang sudah diverifikasi lokal (ES256).
 * Tidak ada round-trip ke server Auth pada setiap render/navigasi.
 * Data yang boleh berubah (role, sekolah, status aktif) tetap dibaca dari DB
 * lewat getSessionProfile, jadi perubahan hak akses langsung berlaku.
 *
 * cache() membuat root layout, layout (app), dan halaman berbagi hasil yang sama.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims ?? null) as Record<string, unknown> | null;
  const id = typeof claims?.sub === 'string' ? claims.sub : null;

  if (!id) {
    return { supabase, user: null as SessionUser | null };
  }

  return {
    supabase,
    user: {
      id,
      email: typeof claims?.email === 'string' ? claims.email : null,
      user_metadata:
        claims?.user_metadata && typeof claims.user_metadata === 'object'
          ? (claims.user_metadata as Record<string, unknown>)
          : {},
    } satisfies SessionUser,
  };
});

export const getSessionProfile = cache(async () => {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return { supabase, user: null, profile: null as SessionProfile | null };
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, school_id, schools(id, name, slug, address, phone, is_active)')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, user, profile: (data as unknown as SessionProfile | null) ?? null };
});

/** Relasi many-to-one bisa dikembalikan sebagai object atau array. */
export function profileSchool(profile: SessionProfile | null): SchoolSummary | null {
  const relation = profile?.schools;
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export function schoolIsActive(profile: SessionProfile | null) {
  return profileSchool(profile)?.is_active !== false;
}
