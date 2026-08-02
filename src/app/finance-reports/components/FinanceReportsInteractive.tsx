'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras } from '@/lib/payroll';
import type { ExpenseCategory } from '@/lib/finance';

interface FinanceReport {
  ingresos: number;
  egresos: number;
  utilidad: number;
  byCategory: { name: string; total: number }[];
  balances: { id: number; name: string; balance: number }[];
}

interface MethodOption { id: number; name: string }

const FinanceReportsInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('finance.reports');

  const [report, setReport] = useState<FinanceReport | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [methods, setMethods] = useState<MethodOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [methodId, setMethodId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (categoryId) params.set('categoryId', categoryId);
      if (methodId) params.set('methodId', methodId);
      const res = await fetch(`/api/reports/finance?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, categoryId, methodId]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  useEffect(() => {
    fetch('/api/expense-categories').then((r) => (r.ok ? r.json() : [])).then(setCategories).catch(() => {});
    fetch('/api/payment-methods').then((r) => (r.ok ? r.json() : [])).then((rows: any[]) =>
      setMethods(rows.filter((m) => m.type !== 'SPLIT_PAYMENT').map((m) => ({ id: m.id, name: m.name })))
    ).catch(() => {});
  }, []);

  const exportCsv = () => {
    if (!report) return;
    const lines = [
      ['Resumen', ''],
      ['Ingresos', report.ingresos],
      ['Egresos', report.egresos],
      ['Utilidad', report.utilidad],
      ['', ''],
      ['Gastos por categoría', 'Monto'],
      ...report.byCategory.map((c) => [c.name, c.total]),
      ['', ''],
      ['Saldo por método', 'Saldo'],
      ...report.balances.map((b) => [b.name, b.balance]),
    ];
    const escape = (c: string | number) => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = '﻿' + lines.map((row) => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-financiero_${from || 'inicio'}_${to || 'hoy'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver reportes financieros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <div>
              <label className="caption text-muted-foreground block mb-1">Desde</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Hasta</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Categoría</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todas</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Método</label>
              <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todos</option>
                {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={exportCsv} disabled={!report}
            className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0">
            <Icon name="ArrowDownTrayIcon" size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {isLoading || !report ? (
        <div className="p-12 flex items-center justify-center text-muted-foreground bg-card rounded-lg border border-border">
          <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* Tarjetas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="ArrowTrendingUpIcon" size={18} className="text-success" />
                <p className="caption text-muted-foreground">Total ingresos</p>
              </div>
              <p className="text-3xl font-heading font-semibold text-foreground">{formatLempiras(report.ingresos)}</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="ArrowTrendingDownIcon" size={18} className="text-error" />
                <p className="caption text-muted-foreground">Total egresos</p>
              </div>
              <p className="text-3xl font-heading font-semibold text-foreground">{formatLempiras(report.egresos)}</p>
            </div>
            <div className="bg-card rounded-lg p-6 shadow-warm border border-primary/30 ring-1 ring-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="BanknotesIcon" size={18} className="text-primary" />
                <p className="caption text-muted-foreground">Utilidad</p>
              </div>
              <p className={`text-3xl font-heading font-semibold ${report.utilidad >= 0 ? 'text-foreground' : 'text-error'}`}>
                {formatLempiras(report.utilidad)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gastos por categoría */}
            <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="font-heading font-semibold text-lg text-foreground">Gastos por categoría</h3>
              </div>
              {report.byCategory.length === 0 ? (
                <p className="p-6 caption text-muted-foreground">Sin gastos en el período.</p>
              ) : (
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    {report.byCategory.map((c) => (
                      <tr key={c.name} className="hover:bg-muted/20">
                        <td className="px-6 py-3 text-foreground">{c.name}</td>
                        <td className="px-6 py-3 text-right font-medium text-foreground">{formatLempiras(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Saldo por método */}
            <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="font-heading font-semibold text-lg text-foreground">Saldo por método de pago</h3>
                <p className="caption text-muted-foreground text-xs">Ingresos recibidos menos gastos pagados (acumulado)</p>
              </div>
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {report.balances.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20">
                      <td className="px-6 py-3 text-foreground">{b.name}</td>
                      <td className={`px-6 py-3 text-right font-medium ${b.balance < 0 ? 'text-error' : 'text-foreground'}`}>
                        {formatLempiras(b.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinanceReportsInteractive;
