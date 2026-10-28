import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Respons PostgREST apa pun yang punya `data` dan `error`. Dibuat longgar
 * (`data: unknown`) agar builder Supabase bertipe kuat tetap cocok tanpa
 * memaksa bentuk baris hasil `.select()`.
 */
type LooseResponse = { data: unknown; error: PostgrestError | null };

/**
 * PostgREST membatasi jumlah baris per respons (default ±1000), sehingga
 * select tanpa paginasi bisa terpotong tanpa error apa pun. Helper ini
 * mengambil seluruh halaman memakai .range() agar semua baris terambil.
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<LooseResponse>,
  pageSize = 1000
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) return { data: rows, error };

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < pageSize) return { data: rows, error: null };
  }
}
