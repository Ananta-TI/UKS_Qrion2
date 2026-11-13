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

/**
 * Baca teks CSV menjadi matriks baris/sel.
 * Mendukung sel berkutip, kutip ganda (""), dan baris baru di dalam sel.
 * Pemisah utama koma; titik koma dipakai bila tidak ada koma sama sekali
 * (umum pada CSV hasil Excel regional Indonesia).
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '');
  const delimiter = source.includes(',') ? ',' : source.includes(';') ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((line) => line.some((value) => value.trim() !== ''));
}
