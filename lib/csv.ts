/**
 * Utilitas CSV ringan untuk ekspor data siswa.
 * Menangani BOM, pemisah koma, tanda kutip, dan baris CRLF/LF.
 */

export type CsvValue = string | number | null | undefined;

/** Bentuk matriks data menjadi teks CSV (dengan BOM agar Excel benar). */
export function toCsv(rows: CsvValue[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? '' : String(cell);
          return /[",\n\r;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(',')
    )
    .join('\r\n');

  return `\uFEFF${body}`;
}

/** Unduh teks CSV sebagai berkas di browser. */
export function downloadCsv(filename: string, rows: CsvValue[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
