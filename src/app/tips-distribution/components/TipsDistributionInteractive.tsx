'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import { money } from '@/components/common/ReceiptCard';

interface Tip {
  id: number;
  appointmentId: number;
  date: string;
  customerName: string;
  amount: number;
  receivedBy: 'CASHIER' | 'EMPLOYEE';
  status: 'PENDING_DISTRIBUTION' | 'DISTRIBUTED';
  distributed: number;
}

interface Employee {
  teamMemberId: number;
  name: string;
  isBookable: boolean;
}

interface SummaryRow {
  employeeId: number;
  employeeName: string;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const TipsDistributionInteractive = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Reparto en curso
  const [openTipId, setOpenTipId] = useState<number | null>(null);
  const [lines, setLines] = useState<{ employeeId: number | null; amount: number | '' }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Rango por fecha de la cita (inicio / fin), p. ej. mensual.
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString() ? `?${params.toString()}` : '';
    Promise.all([
      fetch(`/api/tips${qs}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/tips/summary${qs}`).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/team-members').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([tipList, summaryList, team]) => {
        setTips(tipList);
        setSummary(summaryList);
        setEmployees(team.filter((m: any) => m.isBookable && m.teamMemberId));
      })
      .catch(() => setError('No se pudieron cargar las propinas'))
      .finally(() => setIsLoading(false));
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const startDistribute = async (tip: Tip) => {
    setError('');
    setOpenTipId(tip.id);
    // Precarga el reparto sugerido entre las técnicas que atendieron (editable).
    setLines([{ employeeId: null, amount: '' }]);
    try {
      const res = await fetch(`/api/tips/${tip.id}/suggestion`);
      if (res.ok) {
        const suggestion = await res.json();
        if (Array.isArray(suggestion.lines) && suggestion.lines.length > 0) {
          setLines(suggestion.lines.map((l: { teamMemberId: number; amount: number }) => ({
            employeeId: l.teamMemberId,
            amount: l.amount,
          })));
        }
      }
    } catch {
      /* si falla la sugerencia, queda la línea vacía para llenar a mano */
    }
  };

  const submitDistribution = async (tip: Tip) => {
    const distributions = lines
      .filter((l) => l.employeeId && l.amount !== '' && Number(l.amount) > 0)
      .map((l) => ({ employeeId: l.employeeId, amount: Number(l.amount) }));

    if (distributions.length === 0) return setError('Indique al menos una empleada y un monto');

    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/tips/${tip.id}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributions }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'No se pudo distribuir');
      setOpenTipId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo distribuir');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />;
  }

  const pendingTotal = round2(
    tips.filter((t) => t.status === 'PENDING_DISTRIBUTION').reduce((s, t) => s + (t.amount - t.distributed), 0)
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="text-error" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {/* Filtro por fecha de la cita (inicio / fin) */}
      <div className="bg-card rounded-lg border border-border p-5 shadow-warm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="caption text-xs text-muted-foreground block mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="caption text-xs text-muted-foreground block mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <p className="caption text-xs text-muted-foreground mt-2">Se filtra por la fecha de la cita. Sin fechas, se muestran todas.</p>
      </div>

      {/* Resumen por empleada */}
      <div className="bg-card rounded-lg border border-border p-5 shadow-warm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-lg font-semibold text-foreground">Propina por empleada</h3>
          <div className="text-right">
            <p className="caption text-xs text-muted-foreground">Pendiente de distribuir</p>
            <p className="font-semibold text-warning tabular-nums">{money(pendingTotal)}</p>
          </div>
        </div>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no se ha distribuido ninguna propina.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {summary.map((s) => (
              <div key={s.employeeId} className="px-3 py-2 border border-border rounded-lg bg-background">
                <p className="text-sm font-medium text-foreground">{s.employeeName}</p>
                <p className="text-sm font-semibold text-success tabular-nums">{money(s.total)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Listado de propinas */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-heading text-lg font-semibold text-foreground">Propinas registradas</h3>
        </div>

        {tips.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="SparklesIcon" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay propinas registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tips.map((tip) => {
              const pending = round2(tip.amount - tip.distributed);
              const isOpen = openTipId === tip.id;
              const assigned = round2(lines.reduce((s, l) => s + (l.amount === '' ? 0 : Number(l.amount)), 0));
              const remaining = round2(pending - assigned);

              return (
                <div key={tip.id} className="p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{tip.customerName}</p>
                      <p className="caption text-xs text-muted-foreground">
                        {tip.date} · Recibida por {tip.receivedBy === 'CASHIER' ? 'caja' : 'empleada'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground tabular-nums">{money(tip.amount)}</p>
                      {tip.status === 'DISTRIBUTED' ? (
                        <span className="caption text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                          Distribuida
                        </span>
                      ) : (
                        <span className="caption text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                          Pendiente {money(pending)}
                        </span>
                      )}
                    </div>
                    {tip.status === 'PENDING_DISTRIBUTION' && !isOpen && (
                      <button
                        type="button"
                        onClick={() => startDistribute(tip)}
                        className="px-3 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-smooth"
                      >
                        Distribuir
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="mt-3 p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                      <p className="caption text-xs text-muted-foreground">
                        Reparto sugerido según lo que cobró cada técnica. Ajústalo si quieres.
                      </p>
                      {lines.map((line, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <select
                            value={line.employeeId ?? ''}
                            onChange={(e) => {
                              const next = [...lines];
                              next[index] = { ...line, employeeId: e.target.value === '' ? null : Number(e.target.value) };
                              setLines(next);
                            }}
                            className="flex-1 px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">Empleada...</option>
                            {employees.map((emp) => (
                              <option key={emp.teamMemberId} value={emp.teamMemberId}>
                                {emp.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            value={line.amount}
                            onChange={(e) => {
                              const next = [...lines];
                              next[index] = { ...line, amount: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) };
                              setLines(next);
                            }}
                            placeholder="Monto"
                            className="w-28 px-3 h-10 rounded-lg border border-input bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setLines(lines.filter((_, i) => i !== index))}
                            disabled={lines.length === 1}
                            className="text-muted-foreground hover:text-error disabled:opacity-30"
                            aria-label="Quitar"
                          >
                            <Icon name="XMarkIcon" size={18} />
                          </button>
                        </div>
                      ))}

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setLines([...lines, { employeeId: null, amount: '' }])}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <Icon name="PlusIcon" size={15} />
                          Agregar empleada
                        </button>
                        <span className={`text-sm tabular-nums ${remaining < 0 ? 'text-error' : 'text-muted-foreground'}`}>
                          Por asignar: {money(remaining)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => submitDistribution(tip)}
                          disabled={isSaving || remaining < 0}
                          className="px-5 h-10 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50"
                        >
                          {isSaving ? 'Guardando...' : 'Guardar distribución'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenTipId(null)}
                          className="px-5 h-10 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TipsDistributionInteractive;
