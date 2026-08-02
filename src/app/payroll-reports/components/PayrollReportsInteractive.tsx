'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatLempiras, PAYMENT_SCHEME_LABELS, type PaymentScheme } from '@/lib/payroll';
import { exportCsv, exportXlsx } from '@/lib/exportTable';

interface PayrollRow {
  teamMemberId: number;
  name: string;
  paymentScheme: PaymentScheme;
  monthlySalary: number;
  servicesCount: number;
  totalSold: number;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  totalToPay: number;
}

const PayrollReportsInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('payroll.configure');

  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(`/api/reports/payroll?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo cargar el reporte');
      setRows(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setIsLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  const buildExportData = () => ({
    headers: ['Empleado', 'Esquema', 'Servicios', 'Total vendido', 'Sueldo fijo', 'Comisión pendiente', 'Comisión pagada', 'Total a pagar'],
    rows: rows.map((r) => [
      r.name, PAYMENT_SCHEME_LABELS[r.paymentScheme], r.servicesCount,
      r.totalSold, r.monthlySalary, r.pendingCommission, r.paidCommission, r.totalToPay,
    ]),
  });

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver reportes.</p>
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => ({
      totalSold: acc.totalSold + r.totalSold,
      pendingCommission: acc.pendingCommission + r.pendingCommission,
      totalToPay: acc.totalToPay + r.totalToPay,
    }),
    { totalSold: 0, pendingCommission: 0, totalToPay: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Filtro de período + exportación */}
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md w-full">
            <div>
              <label className="caption text-muted-foreground block mb-1">Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="caption text-muted-foreground block mb-1">Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => { const d = buildExportData(); exportCsv(`reporte-pago_${from || 'inicio'}_${to || 'hoy'}.csv`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icon name="ArrowDownTrayIcon" size={18} />
              CSV
            </button>
            <button
              onClick={() => { const d = buildExportData(); exportXlsx(`reporte-pago_${from || 'inicio'}_${to || 'hoy'}.xlsx`, d.headers, d.rows); }}
              disabled={rows.length === 0}
              className="h-11 px-5 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icon name="ArrowDownTrayIcon" size={18} />
              Excel
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="DocumentChartBarIcon" size={40} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">No hay empleados reservables para reportar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Empleado</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Esquema</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Servicios</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Total vendido</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Sueldo fijo</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Com. pendiente</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Com. pagada</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Total a pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.teamMemberId} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/commission-payments?employeeId=${r.teamMemberId}&status=all`}
                        className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{PAYMENT_SCHEME_LABELS[r.paymentScheme]}</td>
                    <td className="px-4 py-3 text-right text-foreground">{r.servicesCount}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatLempiras(r.totalSold)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatLempiras(r.monthlySalary)}</td>
                    <td className="px-4 py-3 text-right text-warning-foreground">{formatLempiras(r.pendingCommission)}</td>
                    <td className="px-4 py-3 text-right text-success">{formatLempiras(r.paidCommission)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{formatLempiras(r.totalToPay)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30 border-t border-border">
                <tr>
                  <td className="px-4 py-3 font-semibold text-foreground" colSpan={3}>Totales</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatLempiras(totals.totalSold)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-semibold text-warning-foreground">{formatLempiras(totals.pendingCommission)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">{formatLempiras(totals.totalToPay)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollReportsInteractive;
