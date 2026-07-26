export interface CsvColumn {
  key: string;
  header: string;
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(columns: CsvColumn[], rows: Array<Record<string, unknown>>): string {
  const header = columns.map((c) => csvEscape(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}

/** Builds a CSV file client-side and triggers a browser download — no server round-trip, no library. */
export function downloadCsv(filename: string, columns: CsvColumn[], rows: Array<Record<string, unknown>>): void {
  const csv = toCsv(columns, rows);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
