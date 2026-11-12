'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Navigasi halaman untuk daftar panjang.
 *
 * Disembunyikan saat seluruh data muat dalam satu halaman, sehingga daftar
 * pendek tidak menampilkan kontrol yang tidak berguna.
 */
export function Pager({
  page,
  pageSize,
  total,
  onPageChange,
  unit = 'data',
}: {
  /** Halaman aktif, dimulai dari 0. */
  page: number;
  pageSize: number;
  /** Jumlah seluruh baris pada kumpulan data (bukan hanya halaman aktif). */
  total: number;
  onPageChange: (page: number) => void;
  /** Kata benda untuk pembaca layar, mis. "kunjungan". */
  unit?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="toolbar" style={{ marginTop: 16, justifyContent: 'center' }} role="navigation" aria-label="Navigasi halaman">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
      >
        <ChevronLeft className="ico" /> Sebelumnya
      </button>
      <span className="muted text-xs">
        {from}–{to} dari {total} {unit} · Hal {page + 1}/{totalPages}
      </span>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
      >
        Berikutnya <ChevronRight className="ico" />
      </button>
    </div>
  );
}