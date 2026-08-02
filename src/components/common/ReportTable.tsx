'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface ReportTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right';
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  /** Valor usado para ordenar/buscar; si no se da, usa row[key]. */
  sortValue?: (row: T) => string | number;
}

interface ReportTableProps<T> {
  columns: ReportTableColumn<T>[];
  rows: T[];
  /** Claves de `row` incluidas en la búsqueda de texto libre. */
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: string;
}

function ReportTable<T extends Record<string, any>>({
  columns,
  rows,
  searchKeys = [],
  pageSize = 25,
  emptyMessage = 'No hay datos para los filtros seleccionados.',
}: ReportTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
  }, [rows, search, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const valueOf = col.sortValue ?? ((row: T) => row[sortKey]);
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av ?? '').localeCompare(String(bv ?? ''));
    });
    if (sortDir === 'desc') copy.reverse();
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-3">
      {searchKeys.length > 0 && (
        <div className="max-w-xs">
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 caption font-semibold text-muted-foreground uppercase tracking-wider ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground focus:outline-none ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        <Icon name={sortDir === 'asc' ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={12} />
                      ) : (
                        <Icon name="ChevronUpDownIcon" size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center caption text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-2.5 text-foreground ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Filas por página</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="h-8 px-2 rounded-md bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>· {sorted.length} filas</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 px-3 rounded-md border border-border text-foreground text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-3 rounded-md border border-border text-foreground text-sm hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportTable;
