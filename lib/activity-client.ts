'use client';

export type ClientActivityAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'restock'
  | 'stock_out'
  | 'export'
  | 'reset';

type ClientActivityInput = {
  action: ClientActivityAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

async function send(payload: string) {
  return fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  });
}

/**
 * Mengirim log dari browser. Server yang menentukan sekolah dan pelakunya dari
 * sesi, jadi klien tidak bisa menulis log ke sekolah lain.
 */
export async function logClientActivity(input: ClientActivityInput) {
  const payload = JSON.stringify(input);

  try {
    let response = await send(payload);

    // Tepat setelah login, cookie sesi bisa belum terbaca di server.
    if (response.status === 401 || response.redirected) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      response = await send(payload);
    }
  } catch {
    // Log aktivitas tidak boleh memblokir alur utama pengguna.
  }
}
