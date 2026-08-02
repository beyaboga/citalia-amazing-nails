'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import ReasonSelect from '@/components/common/ReasonSelect';
import { useSession } from '@/lib/useSession';
import {
  PRICE_AND_CODE_ERROR,
  PRICE_REASON_REQUIRED_ERROR,
} from '@/lib/pricing';
import {
  STATUS_CONFIG,
  timeToMinutes,
  minutesToTime,
  formatTimeLabel,
  type AppointmentStatus,
  type CalendarTechnician,
} from './calendarConstants';

interface CustomerOption {
  id: number;
  name: string;
  phone: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface AppointmentDraft {
  id?: number;
  customerId: number | null;
  technicianId: number | null;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  serviceIds: number[];
  notes: string;
  /** Precio aplicado por servicio en esta cita (serviceId → precio). */
  servicePrices?: Record<number, number>;
  /** Precio original del catálogo al momento de reservar (serviceId → precio). */
  originalPrices?: Record<number, number>;
  /** Descuentos ya aplicados a la cita (código y/o ajuste manual). */
  discounts?: {
    discountType: 'CODE' | 'MANUAL';
    discountCode: string | null;
    discountName: string | null;
    discountAmount: number;
    originalTotal: number;
    finalTotal: number;
    reason: string | null;
  }[];
}

interface AppointmentModalProps {
  draft: AppointmentDraft;
  technicians: CalendarTechnician[];
  services: ServiceOption[];
  customers: CustomerOption[];
  /** Falso para técnicos: el campo de técnico queda bloqueado en sí mismo. */
  canChooseTechnician: boolean;
  /** Solo con permiso de precios se puede editar el precio de cada servicio. */
  canModifyPricing: boolean;
  /** Solo con permiso se pueden aplicar o quitar códigos de descuento. */
  canApplyDiscount: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

const AppointmentModal = ({
  draft,
  technicians,
  services,
  customers,
  canChooseTechnician,
  canModifyPricing,
  canApplyDiscount,
  onClose,
  onSaved,
}: AppointmentModalProps) => {
  const router = useRouter();
  const { can } = useSession();
  const canCharge = can('payments.charge');
  const existingCode = (draft.discounts ?? []).find((d) => d.discountType === 'CODE') ?? null;
  const isEditMode = Boolean(draft.id);
  const [form, setForm] = useState<AppointmentDraft>(draft);
  const [customerQuery, setCustomerQuery] = useState('');
  const [prices, setPrices] = useState<Record<number, number>>(draft.servicePrices ?? {});
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const [discountCodeInput, setDiscountCodeInput] = useState(existingCode?.discountCode ?? '');
  // Motivo del cambio de precio: obligatorio en cuanto un precio difiera del catálogo.
  const [priceReason, setPriceReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Historial de cambios de precio y descuentos (auditoría), bajo demanda.
  const [history, setHistory] = useState<{
    priceChanges: {
      id: number;
      serviceName: string;
      originalPrice: number;
      newPrice: number;
      reason: string | null;
      modifiedBy: string;
      modifiedAt: string;
    }[];
    discounts: {
      id: number;
      discountType: 'CODE' | 'MANUAL';
      discountCode: string | null;
      reason: string | null;
      discountAmount: number;
      appliedBy: string;
      appliedAt: string;
    }[];
  } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const toggleHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history || !draft.id) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/appointments/${draft.id}/history`);
      if (response.ok) setHistory(await response.json());
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const activeServices = services.filter((service) => service.isActive);
  const selectedServices = activeServices.filter((service) => form.serviceIds.includes(Number(service.id)));

  // Precio efectivo por servicio: el aplicado en la cita o, si es un servicio recién
  // agregado, el del catálogo. Nunca revierte al catálogo un precio ya aplicado.
  const effectivePrice = (service: ServiceOption) => prices[Number(service.id)] ?? service.price;

  // Precio original del catálogo con el que se reservó (para mostrar "L500 → L450").
  const originalOf = (service: ServiceOption) =>
    draft.originalPrices?.[Number(service.id)] ?? service.price;

  // La duración y el precio se muestran calculados en vivo, pero el servidor los
  // vuelve a calcular al guardar (y solo respeta precios personalizados con permiso).
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + effectivePrice(service), 0);

  // Cambio de precio y código de descuento son excluyentes: la cita lleva uno u otro,
  // para que el total tenga un solo ajuste manual.
  const hasPriceChange = selectedServices.some(
    (service) => effectivePrice(service) !== originalOf(service)
  );
  const hasDiscountCode = discountCodeInput.trim() !== '';
  // Una cita antigua puede traer las dos cosas a la vez. En ese caso no se bloquea
  // ninguno de los dos campos: si no, no habría forma de quitar ni uno ni otro.
  const hasConflict = hasPriceChange && hasDiscountCode;
  // El motivo solo se pide por lo que cambia AHORA y se aparta del catálogo: un
  // cambio de una edición anterior ya tiene el suyo en el historial, y volver al
  // precio de catálogo es deshacer, no un cambio que haya que justificar.
  const priceChangedNow = selectedServices.some((service) => {
    const price = effectivePrice(service);
    const saved = draft.servicePrices?.[Number(service.id)] ?? originalOf(service);
    return price !== saved && price !== originalOf(service);
  });
  const endTime = form.startTime
    ? minutesToTime(timeToMinutes(form.startTime) + totalDuration)
    : '';

  const selectedCustomer = customers.find((customer) => customer.id === form.customerId) ?? null;
  const filteredCustomers = customerQuery.trim()
    ? customers
        .filter((customer) =>
          `${customer.name} ${customer.phone ?? ''}`.toLowerCase().includes(customerQuery.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const toggleService = (serviceId: number) => {
    setForm((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(serviceId)
        ? prev.serviceIds.filter((id) => id !== serviceId)
        : [...prev.serviceIds, serviceId],
    }));
  };

  // `intent` decide qué pasa tras guardar: 'save' cierra el modal y recarga la agenda;
  // 'pay' lleva directo al cobro de la cita (la existente en edición, o la recién creada).
  const handleSave = async (intent: 'save' | 'pay' = 'save') => {
    if (!form.customerId) return setError('Debe seleccionar un cliente');
    if (!form.technicianId) return setError('Debe seleccionar un técnico');
    if (form.serviceIds.length === 0) return setError('Debe seleccionar al menos un servicio');
    if (hasPriceChange && hasDiscountCode) return setError(PRICE_AND_CODE_ERROR);
    if (priceChangedNow && !priceReason) return setError(PRICE_REASON_REQUIRED_ERROR);

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(
        isEditMode ? `/api/appointments/${draft.id}` : '/api/appointments',
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Los campos de dinero solo se envían si el usuario tiene el permiso
          // correspondiente; así nadie puede quitar un descuento sin autorización.
          body: JSON.stringify({
            ...form,
            servicePrices: prices,
            ...(canModifyPricing ? { priceReason } : {}),
            ...(canApplyDiscount ? { discountCode: discountCodeInput.trim() || null } : {}),
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al guardar la cita');

      // "Ir a pagar": en alta se usa el id que devuelve el POST; en edición, el de la
      // cita que ya se estaba editando. La cita no cambia de estado por esto.
      if (intent === 'pay') {
        const appointmentId = isEditMode ? draft.id : result.id;
        router.push(`/appointment-payment/${appointmentId}`);
        return;
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la cita');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-card rounded-lg border border-border shadow-warm-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name={isEditMode ? 'PencilSquareIcon' : 'PlusIcon'} size={20} className="text-primary" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              {isEditMode ? 'Editar Cita' : 'Agregar Nueva Cita'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Cerrar"
          >
            <Icon name="XMarkIcon" size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cliente <span className="text-error">*</span>
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary bg-primary/5">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{selectedCustomer.name}</p>
                  <p className="caption text-xs text-muted-foreground">
                    {selectedCustomer.phone || 'Sin teléfono'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, customerId: null }));
                    setCustomerQuery('');
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth flex-shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                />
                {filteredCustomers.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-warm-lg overflow-hidden">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, customerId: customer.id }));
                          setCustomerQuery('');
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted transition-smooth"
                      >
                        <p className="text-sm font-medium text-foreground">{customer.name}</p>
                        <p className="caption text-xs text-muted-foreground">{customer.phone || '—'}</p>
                      </button>
                    ))}
                  </div>
                )}
                {customerQuery.trim() && filteredCustomers.length === 0 && (
                  <p className="caption text-xs text-muted-foreground mt-1">
                    Sin resultados.{' '}
                    <a href="/customer-profile-creation" className="text-primary hover:underline">
                      Registrar cliente nuevo
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Servicios */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Servicios <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {activeServices.map((service) => {
                const isSelected = form.serviceIds.includes(Number(service.id));
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(Number(service.id))}
                    className={`text-left px-3 py-2 rounded-lg border transition-smooth ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
                    <p className="caption text-xs text-muted-foreground tabular-nums">
                      {service.duration} min · L {service.price.toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Técnico, fecha, hora */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="technicianId" className="block text-sm font-medium text-foreground mb-2">
                Técnico asignado <span className="text-error">*</span>
              </label>
              <select
                id="technicianId"
                value={form.technicianId ?? ''}
                disabled={!canChooseTechnician}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, technicianId: Number(event.target.value) || null }))
                }
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Seleccione técnico</option>
                {technicians.map((technician) => (
                  <option key={technician.userId} value={technician.userId}>
                    {technician.name}
                  </option>
                ))}
              </select>
              {!canChooseTechnician && (
                <p className="caption text-xs text-muted-foreground mt-1">
                  Las citas se registran en su propia agenda
                </p>
              )}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
                Estado
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as AppointmentStatus }))
                }
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_CONFIG[status].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-foreground mb-2">
                Fecha <span className="text-error">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>

            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-foreground mb-2">
                Hora inicio <span className="text-error">*</span>
              </label>
              <input
                type="time"
                id="startTime"
                step={900}
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
          </div>

          {/* Resumen calculado */}
          {selectedServices.length > 0 && (
            <div className="bg-muted/40 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="ClockIcon" size={18} className="text-primary" />
                  <span className="text-sm text-foreground tabular-nums">
                    {formatTimeLabel(form.startTime)} – {endTime ? formatTimeLabel(endTime) : '—'}
                  </span>
                  <span className="caption text-xs text-muted-foreground">({totalDuration} min)</span>
                </div>
                <span className="font-semibold text-primary tabular-nums">
                  L {totalPrice.toLocaleString()}
                </span>
              </div>

              {/* Servicios con precio original vs aplicado (cuando difieren) */}
              {selectedServices.some((s) => originalOf(s) !== effectivePrice(s)) && (
                <div className="pt-2 border-t border-border space-y-1">
                  {selectedServices.map((service) => {
                    const original = originalOf(service);
                    const applied = effectivePrice(service);
                    if (original === applied) return null;
                    return (
                      <div key={service.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{service.name}</span>
                        <span className="tabular-nums flex-shrink-0">
                          <span className="text-muted-foreground line-through">
                            L {original.toLocaleString()}
                          </span>{' '}
                          <span className="font-semibold text-primary">L {applied.toLocaleString()}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Descuentos ya aplicados a esta cita */}
              {(draft.discounts ?? []).length > 0 && (
                <div className="pt-2 border-t border-border space-y-1">
                  {(draft.discounts ?? []).map((discount, index) => (
                    <div key={index} className="flex items-start justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <span className="text-muted-foreground">
                          {discount.discountType === 'CODE'
                            ? `Descuento ${discount.discountCode}`
                            : 'Ajuste manual'}
                        </span>
                        {discount.reason && (
                          <p className="text-muted-foreground/80 truncate">{discount.reason}</p>
                        )}
                      </div>
                      <span className="font-medium text-success tabular-nums flex-shrink-0">
                        − L {discount.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total cobrado</span>
                    <span className="font-semibold text-primary tabular-nums">
                      L {(draft.discounts ?? []).slice(-1)[0].finalTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Aplicar / quitar código de descuento. Bloqueado si la cita ya lleva
                  un cambio de precio: se aplica uno u otro, nunca los dos. */}
              {canApplyDiscount && (
                <div className="pt-2 border-t border-border">
                  <label htmlFor="modalDiscountCode" className="block caption text-xs text-muted-foreground mb-1">
                    Código de descuento
                  </label>
                  <input
                    id="modalDiscountCode"
                    type="text"
                    value={discountCodeInput}
                    onChange={(event) => setDiscountCodeInput(event.target.value.toUpperCase())}
                    disabled={hasPriceChange && !hasConflict}
                    placeholder="Ej: SOUTH_10 (vacío = sin código)"
                    className="w-full px-3 h-10 rounded-lg border border-input bg-background text-foreground font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="caption text-xs text-muted-foreground mt-1">
                    {hasPriceChange && !hasConflict
                      ? 'Esta cita tiene un cambio de precio. Restablece los precios de catálogo para aplicar un código.'
                      : 'Se valida al guardar los cambios.'}
                  </p>
                </div>
              )}

              {hasConflict && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-2">
                  <Icon
                    name="ExclamationTriangleIcon"
                    size={16}
                    className="text-warning flex-shrink-0 mt-0.5"
                  />
                  <span className="text-sm text-warning">
                    Esta cita tiene código de descuento y cambio de precio a la vez. Deja solo
                    uno de los dos para poder guardar.
                  </span>
                </div>
              )}

              {/* Cambiar precio: el único ajuste manual del total. */}
              {canModifyPricing && hasDiscountCode && !hasConflict && (
                <div className="pt-2 border-t border-border">
                  <p className="caption text-xs text-muted-foreground">
                    Hay un código de descuento aplicado. Quítalo para cambiar el precio.
                  </p>
                </div>
              )}

              {canModifyPricing && (!hasDiscountCode || hasConflict) && (
                <div className="pt-2 border-t border-border">
                  {showPriceEditor ? (
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div key={service.id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-foreground truncate">{service.name}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="caption text-xs text-muted-foreground">L</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={effectivePrice(service)}
                              onChange={(event) => {
                                const value = event.target.value;
                                setPrices((prev) => ({
                                  ...prev,
                                  [Number(service.id)]: value === '' ? 0 : Math.max(0, Number(value)),
                                }));
                              }}
                              className="w-20 px-2 h-8 rounded-md border border-input bg-background text-foreground text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowPriceEditor(false)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Icon name="CheckIcon" size={15} />
                        Listo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPriceEditor(true)}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <Icon name="PencilSquareIcon" size={15} />
                        Cambiar precio
                      </button>
                      {hasPriceChange && (
                        <button
                          type="button"
                          onClick={() => {
                            setPrices(
                              Object.fromEntries(
                                selectedServices.map((service) => [Number(service.id), originalOf(service)])
                              )
                            );
                            setPriceReason('');
                          }}
                          className="text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          Restablecer precios
                        </button>
                      )}
                    </div>
                  )}

                  {/* Motivo: obligatorio solo si el precio se cambia en esta edición. */}
                  {priceChangedNow && (
                    <div className="pt-2">
                      <label
                        htmlFor="modalPriceReason"
                        className="block caption text-xs text-muted-foreground mb-1"
                      >
                        Motivo del cambio de precio <span className="text-error">*</span>
                      </label>
                      <ReasonSelect
                        id="modalPriceReason"
                        value={priceReason}
                        onChange={setPriceReason}
                        canManage={canModifyPricing}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
              Notas
            </label>
            <textarea
              id="notes"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
              placeholder="Ej: Cliente prefiere tonos nude"
            />
          </div>

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon name="ExclamationCircleIcon" size={18} className="text-error flex-shrink-0" />
              <span className="text-sm text-error font-medium">{error}</span>
            </div>
          )}

          {/* Historial de cambios (auditoría), solo para quien puede modificar precios */}
          {isEditMode && canModifyPricing && (
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={toggleHistory}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Icon name={showHistory ? 'ChevronUpIcon' : 'ClockIcon'} size={15} />
                {showHistory ? 'Ocultar historial de cambios' : 'Ver historial de cambios'}
              </button>

              {showHistory && (
                <div className="mt-3 space-y-3">
                  {isLoadingHistory ? (
                    <div className="h-16 bg-muted rounded-lg animate-pulse" />
                  ) : !history ||
                    (history.priceChanges.length === 0 && history.discounts.length === 0) ? (
                    <p className="caption text-sm text-muted-foreground">
                      Esta cita no tiene cambios de precio ni descuentos registrados.
                    </p>
                  ) : (
                    <>
                      {history.priceChanges.length > 0 && (
                        <div>
                          <p className="caption text-xs font-semibold text-muted-foreground mb-1.5">
                            Cambios de precio
                          </p>
                          <div className="space-y-1.5">
                            {history.priceChanges.map((change) => (
                              <div key={change.id} className="text-xs bg-muted/40 rounded-lg p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground truncate">
                                    {change.serviceName}
                                  </span>
                                  <span className="tabular-nums flex-shrink-0">
                                    <span className="text-muted-foreground line-through">
                                      L {change.originalPrice.toLocaleString()}
                                    </span>{' '}
                                    <span className="font-semibold text-primary">
                                      L {change.newPrice.toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-0.5">
                                  {change.reason ? `${change.reason} · ` : ''}
                                  {change.modifiedBy} · {change.modifiedAt}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {history.discounts.length > 0 && (
                        <div>
                          <p className="caption text-xs font-semibold text-muted-foreground mb-1.5">
                            Descuentos aplicados
                          </p>
                          <div className="space-y-1.5">
                            {history.discounts.map((discount) => (
                              <div key={discount.id} className="text-xs bg-muted/40 rounded-lg p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground truncate">
                                    {discount.discountType === 'CODE'
                                      ? `Código ${discount.discountCode}`
                                      : 'Ajuste manual'}
                                  </span>
                                  <span className="font-semibold text-success tabular-nums flex-shrink-0">
                                    − L {discount.discountAmount.toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-muted-foreground mt-0.5">
                                  {discount.reason ? `${discount.reason} · ` : ''}
                                  {discount.appliedBy} · {discount.appliedAt}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSave('save')}
            disabled={isSaving}
            className="flex-1 h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icon name="CheckCircleIcon" size={18} />
                {isEditMode ? 'Guardar Cambios' : 'Crear Cita'}
              </>
            )}
          </button>

          {/* Guardar la cita y pasar directo al cobro. Solo para quien puede cobrar. */}
          {canCharge && (
            <button
              onClick={() => handleSave('pay')}
              disabled={isSaving}
              className="flex-1 h-11 px-4 bg-background border border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Icon name="BanknotesIcon" size={18} />
              Ir a pagar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
