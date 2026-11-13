export function cn(...classes: unknown[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Usia dalam tahun penuh dari tanggal lahir ISO.
 * Mengembalikan null bila tanggal kosong/tidak valid atau di masa depan.
 */
export function ageFromBirthDate(
  birthDate: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!birthDate) return null;

  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 0 && age < 130 ? age : null;
}

/** Tanggal ISO (YYYY-MM-DD) ke format Indonesia, mis. "3 Mei 2012". */
export function formatDateId(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
