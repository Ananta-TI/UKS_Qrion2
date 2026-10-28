'use client';

import type { Cell, Row } from 'write-excel-file/browser';
import { visitStatusLabel } from '@/lib/visit-status';

/**
 * Ekspor laporan UKS ke berkas `.xlsx` asli memakai `write-excel-file`
 * (pengganti `xlsx` yang punya advisory keamanan). Ukuran kecil dan
 * berjalan penuh di browser tanpa polyfill Node.
 */

export type ReportVisit = {
  id: string;
  student_id?: string | null;
  check_in_at: string;
  chief_complaint?: string | null;
  temperature?: number | null;
  blood_pressure?: string | null;
  weight?: number | null;
  height?: number | null;
  treatment?: string | null;
  final_status?: string | null;
  notes?: string | null;
  students?: { id?: string; full_name: string | null; nis: string | null; class: string | null } | null;
};

export type ReportMedicine = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  stock: number | null;
  min_stock: number | null;
  location: string | null;
  expiry_date: string | null;
};

export type ReportMedicineLog = {
  id: string;
  medicine_id: string;
  type: string;
  qty: number;
  reference_id: string | null;
  notes: string | null;
  created_at: string | null;
};

const HEADER_BG = '#c6e3e0';
const HEADER_BORDER = '#9dc6c1';
const BORDER = '#e2e0ee';

function exportDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function exportTime(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/** Sel teks: `type: String` + format `@` menahan nilai seperti "12 A" tetap teks. */
const text = (value: string): Cell => ({ value, type: String, format: '@' });
const count = (value: number): Cell => ({ value, type: Number });

function headerRow(labels: string[]): Row {
  return labels.map<Cell>((label) => ({
    value: label,
    type: String,
    fontWeight: 'bold',
    backgroundColor: HEADER_BG,
    borderColor: HEADER_BORDER,
    borderStyle: 'thin',
    align: 'center',
    alignVertical: 'center',
    wrap: true,
  }));
}

function body(value: Cell): Cell {
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    return { borderColor: BORDER, borderStyle: 'thin', alignVertical: 'center', ...value };
  }
  return value;
}

function emptyRow(columns: number): Row {
  return Array.from({ length: columns }, () => body('-'));
}

function medicineStatus(m: ReportMedicine) {
  const stock = m.stock ?? 0;
  const min = m.min_stock ?? 5;
  const expiry = m.expiry_date ? new Date(m.expiry_date).getTime() : null;
  const expired = expiry !== null && expiry <= Date.now();
  const soon = expiry !== null && !expired && expiry - Date.now() <= 30 * 24 * 60 * 60 * 1000;

  const parts: string[] = [];
  if (expired) parts.push('Kedaluwarsa');
  else if (soon) parts.push('≤ 30 hari');
  if (stock <= min) parts.push('Stok menipis');
  return parts.length ? parts.join(' · ') : 'Aman';
}

export async function exportReportsExcel({
  visits,
  medicines,
  medicineLogs,
  rangeKey,
}: {
  visits: ReportVisit[];
  medicines: ReportMedicine[];
  medicineLogs: ReportMedicineLog[];
  rangeKey: string;
}): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');

  const visitById = new Map(visits.map((v) => [v.id, v]));

  // ---- Lembar 1: Kunjungan ----------------------------------------------
  const visitHead = [
    'Tanggal', 'Jam', 'Siswa', 'NIS', 'Kelas', 'Keluhan',
    'Suhu (°C)', 'Tekanan Darah', 'Berat (kg)', 'Tinggi (cm)', 'Tindakan', 'Status Akhir', 'Catatan',
  ];
  const visitRows: Row[] = [
    headerRow(visitHead),
    ...visits.map<Row>((v) => [
      body(text(exportDate(v.check_in_at))),
      body(text(exportTime(v.check_in_at))),
      body(text(v.students?.full_name || '-')),
      body(text(v.students?.nis || '-')),
      body(text(v.students?.class || '-')),
      body(v.chief_complaint || '-'),
      body(v.temperature ?? '-'),
      body(v.blood_pressure ?? '-'),
      body(v.weight ?? '-'),
      body(v.height ?? '-'),
      body(v.treatment ?? '-'),
      body(visitStatusLabel(v.final_status ?? null)),
      body(v.notes ?? '-'),
    ]),
  ];

  // ---- Lembar 2: Inventaris Obat ----------------------------------------
  const medHead = ['Nama Obat', 'Kategori', 'Satuan', 'Stok', 'Stok Minimum', 'Lokasi', 'Kedaluwarsa', 'Status'];
  const medRows: Row[] = [
    headerRow(medHead),
    ...(medicines.length
      ? medicines.map<Row>((m) => [
          body(text(m.name)),
          body(text(m.category || '-')),
          body(text(m.unit || '-')),
          body(count(m.stock ?? 0)),
          body(count(m.min_stock ?? 5)),
          body(text(m.location || '-')),
          body(text(m.expiry_date ? exportDate(m.expiry_date) : '-')),
          body(medicineStatus(m)),
        ])
      : [emptyRow(medHead.length)]),
  ];

  // ---- Lembar 3: Riwayat Stok Obat --------------------------------------
  const logHead = ['Tanggal', 'Jam', 'Obat', 'Tipe', 'Jumlah', 'Siswa', 'Catatan'];
  const logRows: Row[] = [
    headerRow(logHead),
    ...(medicineLogs.length
      ? medicineLogs.map<Row>((log) => {
          const med = medicines.find((m) => m.id === log.medicine_id);
          const visit = log.reference_id ? visitById.get(log.reference_id) : null;
          return [
            body(text(exportDate(log.created_at))),
            body(text(exportTime(log.created_at))),
            body(text(med?.name ?? '-')),
            body(text(log.type === 'out' ? 'Keluar' : 'Masuk')),
            body(count(log.type === 'out' ? -log.qty : log.qty)),
            body(text(visit?.students?.full_name ?? '-')),
            body(log.notes || '-'),
          ];
        })
      : [emptyRow(logHead.length)]),
  ];

  const columns = (values: number[]) => values.map((width) => ({ width }));

  await writeXlsxFile([
    { sheet: 'Kunjungan', data: visitRows, columns: columns([12, 8, 24, 12, 8, 28, 10, 14, 10, 10, 28, 18, 24]) },
    { sheet: 'Inventaris Obat', data: medRows, columns: columns([26, 16, 10, 8, 14, 14, 14, 20]) },
    { sheet: 'Riwayat Stok Obat', data: logRows, columns: columns([12, 8, 24, 10, 10, 24, 28]) },
  ]).toFile(`laporan-uks-${rangeKey}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
