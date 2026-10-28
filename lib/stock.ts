/**
 * Satu sumber logika stok & kedaluwarsa obat.
 *
 * Sebelumnya definisi "menipis", "kedaluwarsa", dan "mendekati kedaluwarsa"
 * ditulis ulang di dashboard, lonceng notifikasi, dan inventaris dengan ambang
 * yang bisa berbeda. Semua tempat itu sekarang memakai helper ini agar hasilnya
 * selalu konsisten.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Obat dianggap mendekati kedaluwarsa bila tinggal <= 30 hari. */
export const EXPIRY_SOON_DAYS = 30;

export const DEFAULT_MIN_STOCK = 5;

export type ExpiryState = 'none' | 'expired' | 'expiring' | 'ok';

/** Status kedaluwarsa sebuah tanggal (friksi waktu dihitung dari `now`). */
export function expiryState(
  expiryDate: string | null | undefined,
  now: number
): ExpiryState {
  if (!expiryDate) return 'none';
  const time = new Date(expiryDate).getTime();
  if (Number.isNaN(time)) return 'none';
  if (time <= now) return 'expired';
  if (time <= now + EXPIRY_SOON_DAYS * DAY_MS) return 'expiring';
  return 'ok';
}

export function isExpired(expiryDate: string | null | undefined, now: number) {
  return expiryState(expiryDate, now) === 'expired';
}

/** Benar hanya bila masih ada sisa waktu (belum lewat) dan <= 30 hari. */
export function isExpiringSoon(expiryDate: string | null | undefined, now: number) {
  return expiryState(expiryDate, now) === 'expiring';
}

/** Kedaluwarsa atau mendekati kedaluwarsa. */
export function isExpiryWarning(expiryDate: string | null | undefined, now: number) {
  const state = expiryState(expiryDate, now);
  return state === 'expired' || state === 'expiring';
}

export function isLowStock(
  stock: number | null | undefined,
  minStock: number | null | undefined
) {
  return (stock ?? 0) <= (minStock ?? DEFAULT_MIN_STOCK);
}

/**
 * Deteksi error "tabel belum ada" dari PostgREST/Postgres supaya fitur
 * opsional (mis. `medicine_batches`) tetap berjalan walau migrasinya belum
 * dijalankan, tanpa menampilkan error yang membingungkan.
 */
export function isMissingTable(error: { code?: string } | null | undefined) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}
