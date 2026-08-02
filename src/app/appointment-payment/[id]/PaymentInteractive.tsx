'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import ReceiptCard, { money, formatReceiptDate as formatDate, type ReceiptData } from '@/components/common/ReceiptCard';
import {
  computeTipAmount,
  formatTipOption,
  type PaymentMethod,
  type TipSetting,
  type ReceiptSettings,
} from '@/lib/payments';

interface ServiceLine {
  serviceId: number;
  name: string;
  price: number;
}

interface AppointmentData {
  id: number;
  customerName: string;
  date: string;
  startTime: string;
  technicianName: string | null;
  totalPrice: number;
  serviceLines: ServiceLine[];
  discounts: { discountType: string; discountName: string | null; discountAmount: number; reason: string | null }[];
}

interface CommissionInfo {
  id: number;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'voided';
  serviceName: string;
  calculationMode: 'PER_SERVICE' | 'TIERED_TOTAL';
  schemeName: string;
  employeeName: string;
}

interface CombinableAppointment {
  appointmentId: number;
  technicianName: string | null;
  serviceLines: ServiceLine[];
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
}

type TipMode = 'none' | 'percentage' | 'fixed';

const PaymentInteractive = ({ appointmentId }: { appointmentId: number }) => {
  const router = useRouter();
  const { session, can, isLoading: isLoadingSession } = useSession();
  const canCharge = can('payments.charge');

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [combinable, setCombinable] = useState<CombinableAppointment[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [tipPresets, setTipPresets] = useState<TipSetting[]>([]);
  const [receiptHeader, setReceiptHeader] = useState<ReceiptSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Propina
  const [tipMode, setTipMode] = useState<TipMode>('none');
  const [tipValue, setTipValue] = useState<number | ''>('');
  const [tipReceivedBy, setTipReceivedBy] = useState<'CASHIER' | 'EMPLOYEE'>('CASHIER');

  // Método de pago
  const [isSplit, setIsSplit] = useState(false);
  const [singleMethodId, setSingleMethodId] = useState<number | null>(null);
  const [singleReference, setSingleReference] = useState('');
  const [splitLines, setSplitLines] = useState<{ methodId: number | null; amount: number | ''; reference: string }[]>([
    { methodId: null, amount: '', reference: '' },
  ]);

  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [commission, setCommission] = useState<CommissionInfo[] | null>(null);

  useEffect(() => {
    if (isLoadingSession) return;
    if (!canCharge) {
      setIsLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/appointments/${appointmentId}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/payment-methods').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/tip-settings').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/receipt-settings').then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/appointments/${appointmentId}/payment`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/appointments/${appointmentId}/combinable`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([appt, methodList, tips, header, existing, combinableList]) => {
        setAppointment(appt);
        setCombinable(Array.isArray(combinableList) ? combinableList : []);
        setMethods(methodList.filter((m: PaymentMethod) => m.isActive && m.type !== 'SPLIT_PAYMENT'));
        setTipPresets(tips.filter((t: TipSetting) => t.isActive));
        setReceiptHeader(header);
        const def = methodList.find((m: PaymentMethod) => m.isDefault && m.type !== 'SPLIT_PAYMENT');
        if (def) setSingleMethodId(def.id);

        // Si la cita ya tiene un pago, se muestra el recibo en lugar del cobro.
        // Un pago combinado (isGroup) trae sus propias líneas agrupadas por técnica.
        if (existing) {
          setReceipt({
            receiptNumber: existing.receiptNumber ?? '—',
            date: appt.date,
            customerName: appt.customerName,
            serviceLines: existing.isGroup ? existing.serviceLines : (appt.serviceLines ?? []),
            subtotal: existing.subtotal,
            discountAmount: existing.discountAmount,
            tipAmount: existing.tipAmount,
            totalAmount: existing.totalAmount,
            paidAmount: existing.paidAmount,
            pendingAmount: Math.round((existing.totalAmount - existing.paidAmount) * 100) / 100,
            paymentStatus: existing.paymentStatus,
            methods: existing.details.map((d: any) => ({
              name: d.methodName,
              amount: d.amount,
              reference: d.reference,
            })),
            cashierName: existing.cashierName ?? '—',
          });
          setCommission(Array.isArray(existing.commission) ? existing.commission : null);
        }
      })
      .catch(() => setLoadError('No se pudo cargar la cita'))
      .finally(() => setIsLoading(false));
  }, [appointmentId, canCharge, isLoadingSession]);

  // Citas seleccionadas para cobrar juntas (además de la actual).
  const selectedCandidates = useMemo(
    () => combinable.filter((c) => selectedIds.has(c.appointmentId)),
    [combinable, selectedIds]
  );
  const isCombined = selectedCandidates.length > 0;

  // Líneas de servicio combinadas (actual + seleccionadas), con su técnica, para el
  // resumen y el recibo agrupado.
  const combinedLines = useMemo(() => {
    if (!appointment) return [];
    return [
      ...appointment.serviceLines.map((l) => ({ ...l, technicianName: appointment.technicianName })),
      ...selectedCandidates.flatMap((c) =>
        c.serviceLines.map((l) => ({ ...l, technicianName: c.technicianName }))
      ),
    ];
  }, [appointment, selectedCandidates]);

  // Subtotal, descuentos y total (el servidor los revalida). Suma la cita actual + las seleccionadas.
  const baseDiscount = useMemo(
    () => (appointment?.discounts ?? []).reduce((s, d) => s + d.discountAmount, 0),
    [appointment]
  );
  const subtotal =
    Math.round(((appointment?.totalPrice ?? 0) + selectedCandidates.reduce((s, c) => s + c.subtotal, 0)) * 100) / 100;
  const discountAmount =
    Math.round((baseDiscount + selectedCandidates.reduce((s, c) => s + c.discountAmount, 0)) * 100) / 100;
  const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100;

  const tipAmount = useMemo(() => {
    if (tipMode === 'none' || tipValue === '') return 0;
    return computeTipAmount(tipMode === 'percentage' ? 'PERCENTAGE' : 'FIXED', Number(tipValue), afterDiscount);
  }, [tipMode, tipValue, afterDiscount]);

  const totalAmount = Math.round((afterDiscount + tipAmount) * 100) / 100;

  const splitPaid = useMemo(
    () => Math.round(splitLines.reduce((s, l) => s + (l.amount === '' ? 0 : Number(l.amount)), 0) * 100) / 100,
    [splitLines]
  );
  const splitPending = Math.round((totalAmount - splitPaid) * 100) / 100;

  // En modo combinado el cobro es con un solo método (no pago dividido).
  const useSplit = isSplit && !isCombined;
  const canPay = useSplit
    ? splitLines.some((l) => l.methodId && l.amount !== '' && Number(l.amount) > 0) && splitPaid <= totalAmount + 0.001
    : singleMethodId !== null && totalAmount > 0;

  const handlePay = async () => {
    if (!appointment) return;
    setIsPaying(true);
    setError('');

    const tipPayload = tipMode === 'none' ? null : { mode: tipMode, value: Number(tipValue), receivedBy: tipReceivedBy };
    const methodNames = new Map(methods.map((m) => [m.id, m.name]));

    try {
      if (isCombined) {
        // Cobro combinado: un solo método para todas las citas seleccionadas.
        const response = await fetch('/api/payments/combined', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentIds: [appointment.id, ...selectedCandidates.map((c) => c.appointmentId)],
            tip: tipPayload,
            details: [{ paymentMethodId: singleMethodId, reference: singleReference }],
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'No se pudo registrar el cobro');

        setReceipt({
          receiptNumber: result.receiptNumber,
          date: result.date,
          customerName: result.customerName,
          serviceLines: result.serviceLines,
          subtotal: result.subtotal,
          discountAmount: result.discountAmount,
          tipAmount: result.tipAmount,
          totalAmount: result.totalAmount,
          paidAmount: result.paidAmount,
          pendingAmount: result.pendingAmount,
          paymentStatus: result.paymentStatus,
          methods: [{ name: methodNames.get(singleMethodId as number) ?? '—', amount: result.totalAmount, reference: singleReference || null }],
          cashierName: session?.name ?? '—',
        });
        return;
      }

      const details = useSplit
        ? splitLines
            .filter((l) => l.methodId && l.amount !== '' && Number(l.amount) > 0)
            .map((l) => ({ paymentMethodId: l.methodId, amount: Number(l.amount), reference: l.reference }))
        : [{ paymentMethodId: singleMethodId, amount: totalAmount, reference: singleReference }];

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          split: useSplit,
          tip: tipPayload,
          details,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo registrar el pago');

      setReceipt({
        receiptNumber: result.receiptNumber,
        date: appointment.date,
        customerName: appointment.customerName,
        serviceLines: appointment.serviceLines,
        subtotal: result.subtotal,
        discountAmount: result.discountAmount,
        tipAmount: result.tipAmount,
        totalAmount: result.totalAmount,
        paidAmount: result.paidAmount,
        pendingAmount: result.pendingAmount,
        paymentStatus: result.paymentStatus,
        methods: details.map((d) => ({
          name: methodNames.get(d.paymentMethodId as number) ?? '—',
          amount: d.amount as number,
          reference: (d.reference as string) || null,
        })),
        cashierName: session?.name ?? '—',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setIsPaying(false);
    }
  };

  const toggleCandidate = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setIsSplit(false); // el cobro combinado usa un solo método
      }
      return next;
    });
  };

  if (isLoadingSession || isLoading) {
    return <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />;
  }

  if (!canCharge) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
        <Icon name="ExclamationCircleIcon" size={20} className="text-error" />
        <span className="text-sm text-error font-medium">No tiene permiso para cobrar citas.</span>
      </div>
    );
  }

  if (loadError || !appointment) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
        <Icon name="ExclamationCircleIcon" size={20} className="text-error" />
        <span className="text-sm text-error font-medium">{loadError || 'Cita no encontrada'}</span>
      </div>
    );
  }

  // ---- Recibo (pago recién hecho o ya existente) ----
  if (receipt) {
    return (
      <ReceiptView
        receipt={receipt}
        header={receiptHeader}
        commission={commission}
        onDone={() => router.push('/appointments-calendar')}
      />
    );
  }

  // ---- Flujo de cobro ----
  return (
    <div className="space-y-6">
      {/* Aviso: otras citas del mismo cliente sin cobrar hoy */}
      {combinable.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            <Icon name="UserGroupIcon" size={18} className="text-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground text-sm">
                Este cliente tiene {combinable.length} cita{combinable.length > 1 ? 's' : ''} sin cobrar hoy
              </p>
              <p className="caption text-xs text-muted-foreground">
                Selecciónalas para cobrar todo en un solo recibo. Cada técnica conserva su comisión.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {combinable.map((c) => (
              <label
                key={c.appointmentId}
                className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border cursor-pointer hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.appointmentId)}
                  onChange={() => toggleCandidate(c.appointmentId)}
                  className="w-4 h-4 accent-primary flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.serviceLines.map((l) => l.name).join(', ')}</p>
                  <p className="caption text-xs text-muted-foreground">{c.technicianName ?? 'Sin técnica'}</p>
                </div>
                <span className="tabular-nums text-sm text-foreground">{money(c.afterDiscount)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Resumen del servicio */}
      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        <div className="bg-primary/5 px-5 py-4 border-b border-border">
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {isCombined ? 'Resumen combinado' : 'Resumen de la cita'}
          </h3>
          <p className="caption text-xs text-muted-foreground">
            {appointment.customerName} · {formatDate(appointment.date)}
          </p>
        </div>
        <div className="p-5 space-y-2">
          {isCombined
            ? [...new Map(combinedLines.map((l) => [l.technicianName ?? 'Sin técnica', true])).keys()].map((tech) => (
                <div key={tech} className="space-y-1">
                  <p className="caption text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tech}</p>
                  {combinedLines
                    .filter((l) => (l.technicianName ?? 'Sin técnica') === tech)
                    .map((line, i) => (
                      <div key={`${line.serviceId}-${i}`} className="flex items-center justify-between text-sm pl-2">
                        <span className="text-foreground">{line.name}</span>
                        <span className="tabular-nums text-foreground">{money(line.price)}</span>
                      </div>
                    ))}
                </div>
              ))
            : appointment.serviceLines.map((line) => (
                <div key={line.serviceId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{line.name}</span>
                  <span className="tabular-nums text-foreground">{money(line.price)}</span>
                </div>
              ))}
          <div className="pt-2 border-t border-border space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums text-foreground">{money(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Descuentos</span>
                <span className="tabular-nums text-success">− {money(discountAmount)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Propina</span>
                <span className="tabular-nums text-foreground">{money(tipAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Total a cobrar</span>
              <span className="font-heading text-xl font-bold text-primary tabular-nums">{money(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Paso 1: Propina */}
      <div className="bg-card rounded-lg border border-border p-5 shadow-warm">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-1">Propina</h3>
        <p className="caption text-xs text-muted-foreground mb-4">
          La propina se registra aparte del ingreso del servicio.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {(['none', 'percentage', 'fixed'] as TipMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setTipMode(mode);
                setTipValue('');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                tipMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode === 'none' ? 'Sin propina' : mode === 'percentage' ? 'Porcentaje' : 'Valor personalizado'}
            </button>
          ))}
        </div>

        {tipMode !== 'none' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tipPresets
                .filter((t) => (tipMode === 'percentage' ? t.type === 'PERCENTAGE' : t.type === 'FIXED'))
                .map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setTipValue(preset.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-smooth tabular-nums ${
                      tipValue === preset.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {formatTipOption(preset.type, preset.value)}
                  </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="caption text-xs text-muted-foreground">
                {tipMode === 'percentage' ? 'Porcentaje personalizado' : 'Valor personalizado'}
              </label>
              <div className="flex items-center gap-1">
                {tipMode === 'fixed' && <span className="caption text-xs text-muted-foreground">L</span>}
                <input
                  type="number"
                  min={0}
                  max={tipMode === 'percentage' ? 100 : undefined}
                  value={tipValue}
                  onChange={(e) => setTipValue(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="w-24 px-2 h-9 rounded-md border border-input bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {tipMode === 'percentage' && <span className="caption text-xs text-muted-foreground">%</span>}
              </div>
              {tipAmount > 0 && (
                <span className="ml-auto text-sm font-medium text-foreground tabular-nums">= {money(tipAmount)}</span>
              )}
            </div>

            <div>
              <label className="block caption text-xs text-muted-foreground mb-1">¿Quién recibe la propina?</label>
              <select
                value={tipReceivedBy}
                onChange={(e) => setTipReceivedBy(e.target.value as 'CASHIER' | 'EMPLOYEE')}
                className="w-full sm:w-64 px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="CASHIER">Caja (se distribuye después)</option>
                <option value="EMPLOYEE">Empleada directamente</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Paso 2: Método de pago */}
      <div className="bg-card rounded-lg border border-border p-5 shadow-warm">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Método de pago</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {methods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                setIsSplit(false);
                setSingleMethodId(method.id);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-smooth ${
                !isSplit && singleMethodId === method.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              {method.name}
            </button>
          ))}
          {!isCombined && (
            <button
              type="button"
              onClick={() => setIsSplit(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-smooth inline-flex items-center gap-1.5 ${
                isSplit ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              <Icon name="Squares2X2Icon" size={15} />
              Dividir pago
            </button>
          )}
        </div>

        {/* Método único: referencia opcional */}
        {!isSplit && singleMethodId !== null && (
          <div>
            <label className="block caption text-xs text-muted-foreground mb-1">
              Referencia <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              type="text"
              value={singleReference}
              onChange={(e) => setSingleReference(e.target.value)}
              placeholder="Ej: N° de transferencia o voucher"
              className="w-full px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Pago dividido */}
        {isSplit && (
          <div className="space-y-3">
            {splitLines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                <select
                  value={line.methodId ?? ''}
                  onChange={(e) => {
                    const next = [...splitLines];
                    next[index] = { ...line, methodId: e.target.value === '' ? null : Number(e.target.value) };
                    setSplitLines(next);
                  }}
                  className="sm:col-span-4 px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Método...</option>
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={line.amount}
                  onChange={(e) => {
                    const next = [...splitLines];
                    next[index] = { ...line, amount: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) };
                    setSplitLines(next);
                  }}
                  placeholder="Monto"
                  className="sm:col-span-3 px-3 h-10 rounded-lg border border-input bg-background text-foreground text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  value={line.reference}
                  onChange={(e) => {
                    const next = [...splitLines];
                    next[index] = { ...line, reference: e.target.value };
                    setSplitLines(next);
                  }}
                  placeholder="Referencia (opcional)"
                  className="sm:col-span-4 px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setSplitLines(splitLines.filter((_, i) => i !== index))}
                  disabled={splitLines.length === 1}
                  className="sm:col-span-1 h-10 flex items-center justify-center text-muted-foreground hover:text-error disabled:opacity-30"
                  aria-label="Quitar línea"
                >
                  <Icon name="XMarkIcon" size={18} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setSplitLines([...splitLines, { methodId: null, amount: '', reference: '' }])}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Icon name="PlusIcon" size={15} />
              Agregar pago
            </button>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border text-sm">
              <div>
                <p className="caption text-xs text-muted-foreground">Total</p>
                <p className="font-semibold text-foreground tabular-nums">{money(totalAmount)}</p>
              </div>
              <div>
                <p className="caption text-xs text-muted-foreground">Pagado</p>
                <p className="font-semibold text-foreground tabular-nums">{money(splitPaid)}</p>
              </div>
              <div>
                <p className="caption text-xs text-muted-foreground">Pendiente</p>
                <p className={`font-semibold tabular-nums ${splitPending > 0 ? 'text-warning' : 'text-success'}`}>
                  {money(Math.max(0, splitPending))}
                </p>
              </div>
            </div>
            {splitPending > 0 && (
              <p className="caption text-xs text-warning">
                Queda un saldo pendiente. El pago se guardará como parcial.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handlePay}
          disabled={isPaying || !canPay}
          className="flex-1 h-12 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPaying ? (
            <>
              <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Icon name="CheckCircleIcon" size={18} />
              Pagar ahora
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push('/appointments-calendar')}
          className="px-6 h-12 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

// =========================================================
// Recibo
// =========================================================
const COMMISSION_STATUS_LABELS: Record<CommissionInfo['status'], string> = {
  pending: 'Pendiente',
  approved: 'Pendiente',
  paid: 'Pagada',
  voided: 'Anulada',
};

const ReceiptView = ({
  receipt,
  header,
  commission,
  onDone,
}: {
  receipt: ReceiptData;
  header: ReceiptSettings | null;
  commission: CommissionInfo[] | null;
  onDone: () => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-success print:hidden">
        <Icon name="CheckCircleIcon" size={22} />
        <span className="font-medium">Pago registrado — Recibo {receipt.receiptNumber}</span>
      </div>

      <ReceiptCard receipt={receipt} header={header} />

      {commission && commission.length > 0 && (
        <div className="max-w-md mx-auto bg-card border border-border rounded-lg p-4 space-y-2 print:hidden">
          <p className="caption text-muted-foreground text-xs font-semibold uppercase tracking-wider">Comisión</p>
          {commission.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-foreground">{c.employeeName} · {c.serviceName}</p>
                <p className="caption text-muted-foreground text-xs">
                  {c.calculationMode === 'TIERED_TOTAL' ? 'Escalonado por monto de cita' : 'Por servicio'} · {COMMISSION_STATUS_LABELS[c.status]}
                </p>
              </div>
              <span className="font-medium text-foreground">{money(c.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 max-w-md mx-auto print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth inline-flex items-center justify-center gap-2"
        >
          <Icon name="PrinterIcon" size={18} />
          Imprimir
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth"
        >
          Listo
        </button>
      </div>
    </div>
  );
};

export default PaymentInteractive;
