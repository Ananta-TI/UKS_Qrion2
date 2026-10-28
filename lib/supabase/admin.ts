import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function keyRole(key: string): string | null {
  if (key.startsWith('sb_secret_')) return 'service_role';
  if (!key.startsWith('eyJ')) return null;

  try {
    const payload = key.split('.')[1];
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string };
    return json.role ?? null;
  } catch {
    return null;
  }
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key || key === 'your_service_role_key_here') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local. Ambil dari Supabase Dashboard → Project Settings → API Keys (service_role / secret key), lalu restart dev server.'
    );
  }

  const role = keyRole(key);
  if (role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY yang dipakai bukan service_role (terdeteksi: ${role ?? 'tidak dikenal'}). Ambil kunci "service_role" / "secret key" (bukan anon/publishable) di Supabase → Project Settings → API Keys, lalu restart dev server.`
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
