'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

/**
 * Scanner kartu siswa (keyboard wedge).
 *
 * Alat scan mengirim kode kartu sebagai ketikan keyboard yang sangat cepat,
 * lalu biasanya diakhiri Enter. Komponen ini mendengarkan ketikan tersebut
 * secara global supaya dari halaman mana pun kartu langsung membuka
 * halaman Catat Kunjungan dengan siswa yang cocok.
 */

const MIN_CODE_LENGTH = 4;
/** Jeda maksimum antar karakter agar dianggap hasil scan, bukan ketikan manusia. */
const MAX_SCAN_GAP_MS = 55;
/** Rata-rata jeda maksimum untuk seluruh kode. */
const MAX_SCAN_AVG_MS = 50;
/** Jeda yang memutus rangkaian; ketikan manusia umumnya lebih lambat dari ini. */
const RESET_GAP_MS = 220;
/** Kirim otomatis bila scanner tidak mengirim Enter/Tab. */
const AUTO_SUBMIT_MS = 260;
/** Panjang minimum untuk kirim otomatis tanpa Enter. */
const AUTO_SUBMIT_MIN_LENGTH = 6;

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function CardScanner() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  // Toast object dibuat ulang setiap render provider; simpan versi terbaru
  // agar effect listener tidak perlu dipasang ulang di tengah scan.
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    let buffer = '';
    let lastAt = 0;
    let startedAt = 0;
    let autoTimer: ReturnType<typeof setTimeout> | null = null;
    let busy = false;

    function clearAutoTimer() {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
    }

    function reset() {
      buffer = '';
      lastAt = 0;
      startedAt = 0;
      clearAutoTimer();
    }

    function averageGap(now: number) {
      return buffer.length > 1 ? (now - startedAt) / (buffer.length - 1) : Number.POSITIVE_INFINITY;
    }

    async function submit(rawCode: string) {
      const code = rawCode.trim();
      if (busy || code.length < MIN_CODE_LENGTH) return;

      busy = true;
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id,full_name,class')
          .eq('card_code', code)
          .maybeSingle();

        if (error) {
          if (error.code === '42703' || /card_code/i.test(error.message)) {
            toastRef.current.error(
              'Fitur kartu belum aktif. Jalankan migrasi 012_student_card_code.sql di Supabase.',
              'Kartu Belum Aktif'
            );
          } else {
            toastRef.current.error(`Gagal membaca kartu: ${error.message}`, 'Scan Gagal');
          }
          return;
        }

        if (!data) {
          toastRef.current.error(
            `Kode ${code} belum terdaftar di data siswa.`,
            'Kartu Tidak Dikenal'
          );
          return;
        }

        toastRef.current.success(
          `Kartu dikenali: ${data.full_name}${data.class ? ` · ${data.class}` : ''}`,
          'Kartu Siswa'
        );
        router.push(`/visits/new?student=${data.id}`);
      } finally {
        busy = false;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

      const now = performance.now();
      const editable = isEditableTarget(event.target);

      // Enter/Tab adalah akhir rangkaian dari sebagian besar scanner.
      if (event.key === 'Enter' || event.key === 'Tab') {
        const isScan =
          buffer.length >= MIN_CODE_LENGTH && averageGap(now) <= MAX_SCAN_AVG_MS;

        if (isScan) {
          event.preventDefault();
          event.stopPropagation();
          const code = buffer;
          reset();
          void submit(code);
        } else {
          reset();
        }
        return;
      }

      // Hanya karakter tunggal (angka/huruf) yang masuk ke buffer.
      if (event.key.length !== 1) return;

      const gap = now - lastAt;
      if (!buffer || gap > RESET_GAP_MS) {
        buffer = event.key;
        startedAt = now;
      } else {
        buffer += event.key;
      }
      lastAt = now;

      const avg = averageGap(now);
      const looksLikeScan =
        buffer.length >= 2 && gap <= MAX_SCAN_GAP_MS && avg <= MAX_SCAN_AVG_MS;

      if (editable && !looksLikeScan) {
        // Ketikan manusia: biarkan input bekerja seperti biasa.
        reset();
        return;
      }

      if (looksLikeScan) {
        // Scanner sedang mengetik; jangan biarkan karakter masuk ke input
        // atau memicu aksi default halaman.
        event.preventDefault();
      }

      clearAutoTimer();
      if (buffer.length >= AUTO_SUBMIT_MIN_LENGTH && looksLikeScan) {
        autoTimer = setTimeout(() => {
          const code = buffer;
          reset();
          void submit(code);
        }, AUTO_SUBMIT_MS);
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearAutoTimer();
    };
  }, [router, supabase]);

  return null;
}
