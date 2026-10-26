-- ============================================================
-- Index performa untuk query dashboard & laporan
-- Jalankan SEKALI di Supabase SQL Editor.
-- Index lama per school_id tetap dipertahankan; index komposit ini
-- membantu query yang memfilter sekolah lalu mengurutkan waktu.
-- ============================================================

-- Dashboard: kunjungan per sekolah diurutkan berdasarkan waktu.
create index if not exists visits_school_check_in_idx
  on public.visits(school_id, check_in_at desc);

-- Laporan: filter status akhir dalam rentang waktu tertentu.
create index if not exists visits_school_status_check_in_idx
  on public.visits(school_id, final_status, check_in_at desc);

-- Dashboard: daftar kelas siswa per sekolah.
create index if not exists students_school_class_idx
  on public.students(school_id, class);

-- Inventaris: stok obat per sekolah diurutkan berdasarkan nama.
create index if not exists medicines_school_name_idx
  on public.medicines(school_id, name);

-- Log aktivitas sudah punya activity_logs_school_created_idx
-- dari database/activity_logs.sql; tidak perlu diduplikasi.
