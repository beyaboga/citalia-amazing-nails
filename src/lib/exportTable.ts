/**
 * Exportación de tablas de reporte a CSV y Excel. Recibe exactamente las filas ya
 * filtradas/ordenadas que están en pantalla — no vuelve a consultar el servidor.
 */

function escapeCsvCell(cell: string | number): string {
  const s = String(cell ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Descarga un .csv con BOM UTF-8 (para que Excel interprete bien los acentos). */
export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  const csv = '﻿' + lines.join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Descarga un .xlsx real. Import dinámico: xlsx pesa ~1MB, solo se carga al exportar. */
export async function exportXlsx(filename: string, headers: string[], rows: (string | number)[][]): Promise<void> {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Reporte');
  XLSX.writeFile(workbook, filename);
}
