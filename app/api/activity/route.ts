import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth';
import { logActivity, type ActivityAction } from '@/lib/activity';

const allowed = new Set<ActivityAction>([
  'login',
  'logout',
  'create',
  'update',
  'delete',
  'restock',
  'stock_out',
  'export',
]);

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function metadataOf(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const json = JSON.stringify(value);
    if (json.length > 2000) return {};
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Satu pintu masuk log aktivitas dari browser. Sekolah, pelaku, dan nama
 * pelaku selalu diambil dari sesi Supabase, bukan dari body request.
 */
export async function POST(request: Request) {
  const { profile, user } = await getSessionProfile();

  if (!profile || !user) {
    return NextResponse.json({ ok: false, error: 'Sesi tidak ditemukan.' }, { status: 401 });
  }

  if (!profile.school_id) {
    return NextResponse.json({ ok: false, error: 'Akun tidak terikat ke sekolah.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Body tidak valid.' }, { status: 400 });
  }

  const action = clean(body.action, 20) as ActivityAction;
  const entity = clean(body.entity, 60);
  const summary = clean(body.summary, 240);

  if (!allowed.has(action) || !entity || !summary) {
    return NextResponse.json({ ok: false, error: 'Log tidak valid.' }, { status: 400 });
  }

  const metadata = metadataOf(body.metadata);
  const userAgent = clean(request.headers.get('user-agent'), 180);

  await logActivity({
    schoolId: profile.school_id,
    actorId: profile.id,
    actorName: profile.full_name || user.email || profile.email || 'Pengguna UKS',
    action,
    entity,
    entityId: clean(body.entity_id, 80) || null,
    summary,
    metadata: userAgent ? { ...metadata, user_agent: userAgent } : metadata,
  });

  return NextResponse.json({ ok: true });
}
