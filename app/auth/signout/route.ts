import { logActivity } from '@/lib/activity';
import { getSessionProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
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
  return NextResponse.redirect(new URL('/auth/signin', request.url));
}
