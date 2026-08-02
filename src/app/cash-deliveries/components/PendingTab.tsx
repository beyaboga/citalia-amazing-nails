'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { money, type EmployeePending } from '@/lib/cashDeliveries';

interface PendingTabProps {
  onGoToEmployee: (employeeId: number) => void;
}

const PendingTab = ({ onGoToEmployee }: PendingTabProps) => {
  const [rows, setRows] = useState<EmployeePending[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/cash-deliveries/pending')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError('No se pudo cargar el pendiente por empleada'))
      .finally(() => setIsLoading(false));
  }, []);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  if (isLoading) {
    return <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />;
  }

  if (error) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
        <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
        <span className="text-sm text-error font-medium">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
        <p className="caption text-xs text-muted-foreground">Total pendiente de entregar (todas las empleadas)</p>
        <p className="text-3xl font-heading font-semibold text-foreground">{money(grandTotal)}</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="CheckCircleIcon" size={40} className="text-success mx-auto mb-3" />
            <p className="text-foreground font-medium">No hay dinero pendiente de entregar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Empleada</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Citas</th>
                  <th className="px-4 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">Por método</th>
                  <th className="px-4 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">Total pendiente</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.employeeId} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{r.employeeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.paymentCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.byMethod.map((m) => `${m.methodName}: ${money(m.amount)}`).join(' · ')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">{money(r.total)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onGoToEmployee(r.employeeId)}
                        className="px-3 h-9 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary whitespace-nowrap"
                      >
                        Nueva Entrega
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingTab;
