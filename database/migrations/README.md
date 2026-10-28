# Migrasi UKS — Integritas Data & Fitur

Folder ini berisi migrasi **lanjutan** setelah `database/schema.sql`,
`database/migration_multi_tenant.sql`, dan `database/activity_logs.sql`.

Semua file idempotent (aman dijalankan ulang). Jalankan **berurutan**
di Supabase → SQL Editor:

| Urutan | File | Isi |
| ------ | ---- | --- |
| 1 | `001_tenant_defaults.sql` | Pastikan `school_id` otomatis terisi (default + trigger) & tetap `NOT NULL`. |
| 2 | `002_medicine_batches.sql` | Tabel `medicine_batches` (qty + kedaluwarsa per penerimaan) + backfill saldo awal. |
| 3 | `003_dispense_medicines.sql` | RPC atomik `dispense_medicines()` untuk memotong stok saat kunjungan. |
| 4 | `004_saved_reports.sql` | Tabel `saved_reports` agar laporan bisa dibagikan antar-staf. |
| 5 | `005_default_medicines.sql` | Seeder obat bawaan untuk setiap sekolah baru + backfill sekolah lama. |
| 6 | `006_stock_opname.sql` | RPC `apply_stock_opname()` untuk penyesuaian stok hasil opname. |
| 7 | `007_tenant_isolation_test.sql` | Fungsi `tenant_isolation_report()` untuk memverifikasi isolasi antar-sekolah. |
| 8 | `008_stock_restock.sql` | RPC atomik `restock_medicine()` untuk menambah stok (log + batch sekaligus). |

## Catatan kompatibilitas

Aplikasi tetap berjalan walau migrasi belum dijalankan:

- Pemotongan stok memakai RPC `dispense_medicines` bila tersedia, dan otomatis
  **jatuh ke mode compare-and-set** lama bila RPC belum ada.
- Penambahan stok memakai RPC `restock_medicine` bila tersedia, dan otomatis
  **jatuh ke mode compare-and-set** lama bila RPC belum ada.
- Tabel `medicine_batches` dan `saved_reports` opsional — fitur terkait hanya
  muncul setelah tabel tersedia.

## Verifikasi cepat

```sql
select * from public.tenant_isolation_report();
```
