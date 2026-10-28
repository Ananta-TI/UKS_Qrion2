/**
 * Satu sumber label status kunjungan supaya teks di seluruh halaman
 * (dashboard, daftar kunjungan, laporan, form, dan export) selalu sama.
 */
export const visitStatusLabels: Record<string, string> = {
  back_to_class: 'Kembali ke kelas',
  referred: 'Dirujuk ke faskes/RS',
  picked_up: 'Dijemput orang tua',
};

export const visitStatusUnknownLabel = 'Belum diisi';

export function visitStatusLabel(status: string | null | undefined) {
  if (!status) return visitStatusUnknownLabel;
  return visitStatusLabels[status] ?? status;
}
