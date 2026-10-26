import { logActivity } from '@/lib/activity';
import { getSessionProfile } from '@/lib/auth';
import { PREFS_COOKIE } from '@/lib/preferences';
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

async function signOut(request: NextRequest) {
  const { profile, user } = await getSessionProfile();

  if (profile?.school_id && user) {
    await logActivity({
      schoolId: profile.school_id,
      actorId: profile.id,
      actorName: profile.full_name ?? user.email ?? profile.email,
      action: 'logout',
      entity: 'session',
      summary: 'Keluar dari aplikasi',
    });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL('/auth/signin', request.url));
  response.cookies.delete(PREFS_COOKIE);
  return response;
}

/** Logout normal hanya lewat POST agar tidak terpicu prefetch link. */
export async function POST(request: NextRequest) {
  return signOut(request);
}

/**
 * GET dipakai satu kasus khusus: sekolah dinonaktifkan dan sesi harus
 * dibersihkan. Route ini tidak pernah dipasang sebagai link yang bisa
 * diprefetch, jadi tidak ada efek samping saat halaman dibuka.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('reason') === 'inactive') {
    return signOut(request);
  }

  return NextResponse.redirect(new URL('/auth/signin', request.url));
}
