import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/database.types';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'restock'
  | 'stock_out'
  | 'export'
  | 'impersonate';

export type ActivityInput = {
  schoolId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  action: ActivityAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

/**
 * Menyimpan satu baris log aktivitas memakai service role sehingga tidak
 * bergantung pada RLS dan tetap berjalan dari alur server mana pun.
 * Kegagalan pencatatan tidak boleh membatalkan perubahan data utama.
 */
export async function logActivity(input: ActivityInput) {
  if (!input.schoolId) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('activity_logs').insert({
      school_id: input.schoolId,
      actor_id: input.actorId ?? null,
      actor_name: input.actorName ?? null,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      summary: input.summary,
      metadata: (input.metadata ?? {}) as Json,
    });

    if (error) {
      console.warn(`[activity] gagal menyimpan log "${input.summary}": ${error.message}`);
    }
  } catch (error) {
    console.warn(`[activity] gagal menyimpan log "${input.summary}":`, (error as Error).message);
  }
}
