'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import ReasonSelect from '@/components/common/ReasonSelect';
import { useSession } from '@/lib/useSession';
import {
  PRICE_AND_CODE_ERROR,
  PRICE_REASON_REQUIRED_ERROR,
} from '@/lib/pricing';
import {
  buildWhatsAppUrl,
  renderTemplate,
  formatDateForMessage,
  formatDurationLong,
  type WhatsAppTemplate,
} from '@/lib/whatsapp';
import CopyButton from '@/components/common/CopyButton';
import ClientPicker, { type CustomerOption } from './ClientPicker';
import ServicePicker, { type ServiceOption } from './ServicePicker';
import {
  STATUS_CONFIG,
  timeToMinutes,
  minutesToTime,
  formatTimeLabel,
  workingSlotsFor,
  type AppointmentStatus,
  type AvailabilityData,
} from '@/app/appointments-calendar/components/calendarConstants';

interface TechnicianOption {
  userId: number;
  name: string;
  jobTitle: string | null;
}

const STATUS_OPTIONS: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
];

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

const AppointmentFormInteractive = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isLoading: isLoadingSession, can } = useSession();

  const canManageAny = can('appointments.manage.any');
  const canSeeCommission = can('reports.view');
  const canCharge = can('payments.charge');

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [commissions, setCommissions] = useState<Record<string, { amount: number; label: string }>>({});
  const [dayAppointments, setDayAppointments] = useState<{ startTime: string; endTime: string; id: number }[]>([]);

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [date, setDate] = useState(searchParams.get('date') || todayIso());
  const [startTime, setStartTime] = useState(searchParams.get('time') || '09:00');
  const [status, setStatus] = useState<AppointmentStatus>('pending');
  const [serviceIds, setServiceIds] = useState<number[]>([]);
  // Cantidad por servicio (para agendar el mismo servicio varias veces, p. ej. la
  // clienta llega con una acompañante). Por defecto 1.
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');

  // Precios personalizados para esta cita (serviceId → precio). No tocan el catálogo.
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>({});
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const canModifyPricing = can('pricing.modify');

  // Código de descuento aplicado en el cobro.
  const canApplyDiscount = can('discounts.apply');
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountAmount: number;
    totalAfter: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);

  // Motivo del cambio de precio. Obligatorio en cuanto algún precio difiera del
  // catálogo: el cambio de precio ES el único ajuste manual del total.
  const [priceReason, setPriceReason] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Mensaje de WhatsApp de confirmación. Se arma al guardar y se envía desde el
  // número del salón, para que la clienta pueda responder al chat de siempre.
  const [whatsappTemplate, setWhatsappTemplate] = useState<WhatsAppTemplate | null>(null);
  const [confirmation, setConfirmation] = useState<{ message: string; url: string | null } | null>(
    null
  );

  // Prefill desde la URL: clic en el calendario, "agendar" desde un cliente, o
  // el regreso tras registrar un cliente nuevo (que reanexa customerId y conserva
  // los servicios que ya se habían elegido).
  useEffect(() => {
    const qsCustomer = searchParams.get('customerId');
    if (qsCustomer) setCustomerId(Number(qsCustomer));

    const qsServices = searchParams.get('serviceIds');
    if (qsServices) {
      setServiceIds(qsServices.split(',').map(Number).filter((id) => Number.isInteger(id)));
    }
  }, [searchParams]);

  // El técnico arranca fijado en sí mismo cuando el usuario no puede elegir a otros.
  useEffect(() => {
    if (isLoadingSession || !session) return;
    const qsTechnician = searchParams.get('technicianId');
    if (!canManageAny) {
      setTechnicianId(session.id);
    } else if (qsTechnician) {
      setTechnicianId(Number(qsTechnician));
    }
  }, [isLoadingSession, session, canManageAny, searchParams]);

  useEffect(() => {
    const load = async () => {
      const [servicesRes, categoriesRes, teamRes, customersRes, schedulesRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/service-categories'),
        fetch('/api/team-members'),
        fetch('/api/customers'),
        fetch('/api/team-members/schedules'),
      ]);

      if (servicesRes.ok) setServices(await servicesRes.json());
      if (categoriesRes.ok) {
        const cats = await categoriesRes.json();
        setCategories(cats.map((c: any) => c.name));
      }
      if (teamRes.ok) {
        const team = await teamRes.json();
        setTechnicians(
          team
            .filter((m: any) => m.isBookable && m.hasAccess)
            .map((m: any) => ({ userId: m.userId, name: m.name, jobTitle: m.jobTitle }))
        );
      }
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (schedulesRes.ok) setAvailability(await schedulesRes.json());
    };

    load().catch(() => setError('No se pudieron cargar los datos'));
  }, []);

  // Plantilla del mensaje de confirmación. Si no se puede cargar, la cita se guarda
  // igual: el mensaje es un extra, no un requisito para agendar.
  useEffect(() => {
    fetch('/api/whatsapp-templates')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: WhatsAppTemplate[]) => {
        setWhatsappTemplate(rows.find((t) => t.event === 'created') ?? null);
      })
      .catch(() => setWhatsappTemplate(null));
  }, []);

  // Comisión del técnico elegido (solo si el usuario tiene permiso para verla).
  useEffect(() => {
    if (!technicianId || !canSeeCommission) {
      setCommissions({});
      return;
    }
    fetch(`/api/commissions/resolve?technicianId=${technicianId}`)
      .then((res) => (res.ok ? res.json() : {}))
      .then(setCommissions)
      .catch(() => setCommissions({}));
  }, [technicianId, canSeeCommission]);

  // Citas del técnico ese día, para avisar de conflictos antes de guardar.
  const loadDayAppointments = useCallback(async () => {
    if (!technicianId || !date) {
      setDayAppointments([]);
      return;
    }
    const params = new URLSearchParams({ from: date, to: date, technicianId: String(technicianId) });
    try {
      const res = await fetch(`/api/appointments?${params}`);
      if (!res.ok) return setDayAppointments([]);
      const data = await res.json();
      // Solo ocupan la agenda los estados activos: una cita cancelada, "no asistió"
      // o completada libera el espacio (igual que la restricción de traslape en la BD).
      const OCCUPYING = ['pending', 'confirmed', 'in_progress'];
      setDayAppointments(
        data
          .filter((a: any) => OCCUPYING.includes(a.status))
          .map((a: any) => ({ id: a.id, startTime: a.startTime, endTime: a.endTime }))
      );
    } catch {
      // Sin esta lista solo se pierde el aviso de traslape; el servidor lo rechaza igual.
      setDayAppointments([]);
    }
  }, [technicianId, date]);

  useEffect(() => {
    loadDayAppointments();
  }, [loadDayAppointments]);

  // Si cambia el carrito (servicios, precios o cliente) el monto ya calculado deja de
  // ser válido, así que se limpia y se pide reaplicar. El backend revalida igual al
  // guardar, pero así el total en pantalla nunca miente.
  // El ref evita depender de appliedDiscount, que provocaría un bucle.
  const appliedDiscountRef = useRef(appliedDiscount);
  appliedDiscountRef.current = appliedDiscount;

  useEffect(() => {
    if (appliedDiscountRef.current) {
      setAppliedDiscount(null);
      setDiscountError('Cambiaron los datos de la cita. Vuelve a aplicar el código.');
    } else {
      setDiscountError('');
    }
  }, [serviceIds, priceOverrides, customerId, quantities]);

  const selectedServices = useMemo(
    () => services.filter((service) => serviceIds.includes(Number(service.id))),
    [services, serviceIds]
  );

  // Precio efectivo de un servicio en esta cita: el personalizado o el del catálogo.
  const effectivePrice = (service: ServiceOption) =>
    priceOverrides[Number(service.id)] ?? service.price;

  // Cantidad de un servicio (mínimo 1). Cada unidad se agenda como una línea propia.
  const qtyOf = (service: ServiceOption) => quantities[Number(service.id)] ?? 1;

  const setQty = (serviceId: number, next: number) => {
    const clamped = Math.max(1, Math.min(20, Math.floor(next)));
    setQuantities((prev) => ({ ...prev, [serviceId]: clamped }));
  };

  const toggleService = (serviceId: number) => {
    const isSelected = serviceIds.includes(serviceId);
    setServiceIds((prev) => (isSelected ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]));
    if (isSelected) {
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      });
    }
  };

  const removeService = (serviceId: number) => {
    setServiceIds((prev) => prev.filter((id) => id !== serviceId));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  };

  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration * qtyOf(service), 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + effectivePrice(service) * qtyOf(service), 0);
  // Total de catálogo, para poder mostrar cuánto bajó (o subió) el cambio de precio.
  const catalogTotal = selectedServices.reduce((sum, service) => sum + service.price * qtyOf(service), 0);
  // Con un código aplicado el editor de precios queda cerrado: son excluyentes.
  const priceEditorOpen = showPriceEditor && !appliedDiscount;
  const hasPriceChange = selectedServices.some(
    (service) => effectivePrice(service) !== service.price
  );
  const priceChangeAmount = Math.round((catalogTotal - totalPrice) * 100) / 100;
  const totalCommission = selectedServices.reduce(
    (sum, service) => sum + (commissions[service.id]?.amount ?? 0) * qtyOf(service),
    0
  );
  const endTime = startTime && totalDuration > 0
    ? minutesToTime(timeToMinutes(startTime) + totalDuration)
    : startTime;

  // Cambio de precio y código de descuento son excluyentes: la cita lleva uno u otro,
  // nunca los dos. Así solo existe un ajuste manual del total en toda la aplicación.
  const finalTotal = appliedDiscount ? appliedDiscount.totalAfter : totalPrice;

  // Aviso (no bloqueante): la hora cae fuera del horario del técnico.
  const outsideSchedule = useMemo(() => {
    if (!technicianId || totalDuration === 0) return false;
    const slots = workingSlotsFor(availability, technicianId, date);
    if (slots.length === 0) return true;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return !slots.some((slot) => start >= timeToMinutes(slot.start) && end <= timeToMinutes(slot.end));
  }, [technicianId, availability, date, startTime, endTime, totalDuration]);

  // Conflicto con otra cita del mismo técnico (el servidor también lo rechaza).
  const conflict = useMemo(() => {
    if (totalDuration === 0) return null;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    return dayAppointments.find(
      (appointment) =>
        start < timeToMinutes(appointment.endTime) && end > timeToMinutes(appointment.startTime)
    );
  }, [dayAppointments, startTime, endTime, totalDuration]);

  const selectedTechnician = technicians.find((t) => t.userId === technicianId) ?? null;

  // Al registrar un cliente nuevo se conserva el estado de la cita en la URL de
  // regreso, para no perder fecha, hora, técnico ni servicios ya seleccionados.
  const newCustomerHref = useMemo(() => {
    const returnParams = new URLSearchParams({ date, time: startTime });
    if (technicianId) returnParams.set('technicianId', String(technicianId));
    if (serviceIds.length > 0) returnParams.set('serviceIds', serviceIds.join(','));
    const returnTo = `/new-appointment-creation?${returnParams}`;
    return `/customer-profile-creation?returnTo=${encodeURIComponent(returnTo)}`;
  }, [date, startTime, technicianId, serviceIds]);

  // Si cambian los servicios, los precios o el cliente, el descuento aplicado queda
  // obsoleto (el subtotal cambió) y se debe volver a aplicar.
  useEffect(() => {
    setAppliedDiscount(null);
    setDiscountError('');
  }, [serviceIds, priceOverrides, customerId, quantities]);

  const applyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;
    if (serviceIds.length === 0) {
      setDiscountError('Selecciona servicios antes de aplicar un código');
      return;
    }
    if (hasPriceChange) {
      setDiscountError(PRICE_AND_CODE_ERROR);
      return;
    }
    setIsValidatingDiscount(true);
    setDiscountError('');
    try {
      const response = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, customerId, serviceIds, servicePrices: priceOverrides }),
      });
      const result = await response.json();
      if (!response.ok || !result.valid) {
        setAppliedDiscount(null);
        setDiscountError(result?.reason || result?.error || 'Código inválido');
        return;
      }
      setAppliedDiscount({
        code: result.code,
        discountAmount: result.discountAmount,
        totalAfter: result.totalAfter,
      });
    } catch {
      setDiscountError('No se pudo validar el código');
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  // `intent` decide qué pasa tras guardar: 'save' sigue el flujo normal (confirmación
  // por WhatsApp → calendario); 'pay' lleva directo al cobro de la cita recién creada.
  const handleSave = async (intent: 'save' | 'pay' = 'save') => {
    if (!customerId) return setError('Debe seleccionar un cliente');
    if (!technicianId) return setError('Debe seleccionar un técnico');
    if (serviceIds.length === 0) return setError('Debe seleccionar al menos un servicio');
    if (hasPriceChange && !priceReason) return setError(PRICE_REASON_REQUIRED_ERROR);

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          technicianId,
          date,
          startTime,
          serviceIds,
          quantities,
          status,
          notes,
          // El backend solo los aplica si el usuario tiene permiso de precios, y
          // exige el motivo cuando el precio difiere del catálogo.
          servicePrices: priceOverrides,
          priceReason: hasPriceChange ? priceReason : undefined,
          // El backend re-valida el código y lo aplica solo con permiso.
          discountCode: appliedDiscount?.code,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al guardar la cita');

      // "Ir a pagar": la cita queda creada y se pasa directo al cobro. La cita sigue
      // "pendiente de pago" (derivado: aún sin pago registrado); no se toca su estado.
      if (intent === 'pay') {
        router.push(`/appointment-payment/${result.id}`);
        return;
      }

      // La cita ya quedó guardada. El mensaje se ofrece después, para que un
      // problema con WhatsApp nunca impida agendar.
      const draft = buildConfirmationMessage();
      if (draft) {
        setConfirmation(draft);
        setIsSaving(false);
        return;
      }

      goToCalendar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la cita');
    } finally {
      setIsSaving(false);
    }
  };

  const goToCalendar = () => {
    router.push('/appointments-calendar');
    router.refresh();
  };

  /**
   * Arma el mensaje de confirmación con los datos de la cita recién guardada.
   * Devuelve null si el mensaje está apagado en la configuración: en ese caso se
   * vuelve al calendario sin preguntar nada.
   */
  const buildConfirmationMessage = () => {
    if (!whatsappTemplate?.enabled) return null;

    const customer = customers.find((c) => c.id === customerId) ?? null;
    if (!customer) return null;

    const message = renderTemplate(whatsappTemplate.body, {
      cliente: customer.name,
      fecha: formatDateForMessage(date),
      hora: formatTimeLabel(startTime),
      servicios: selectedServices
        .map(
          (service) =>
            `${service.name}${qtyOf(service) > 1 ? ` (x${qtyOf(service)})` : ''} (${formatDurationLong(service.duration)})`
        )
        .join('\n'),
      duracion: formatDurationLong(totalDuration),
      profesional: selectedTechnician?.name ?? '',
      total: `L ${finalTotal.toLocaleString()}`,
    });

    return { message, url: buildWhatsAppUrl(customer.phone, message) };
  };

  if (isLoadingSession) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 bg-card rounded-lg border border-border animate-pulse" />
          <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
        </div>
        <div className="h-80 bg-card rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulario */}
      <div className="lg:col-span-2 space-y-6">
        <ClientPicker
          customers={customers}
          selectedId={customerId}
          onSelect={setCustomerId}
          newCustomerHref={newCustomerHref}
          canCreateCustomer={can('customers.manage') || can('customers.create')}
        />

        <ServicePicker
          services={services}
          categories={categories}
          selectedIds={serviceIds}
          commissions={commissions}
          onToggle={toggleService}
        />

        {/* Profesional y horario */}
        <section className="bg-card rounded-lg border border-border p-6 shadow-warm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="CalendarDaysIcon" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Profesional y horario</h2>
              <p className="caption text-muted-foreground text-sm">
                Elige quién atiende y cuándo
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="technician" className="block text-sm font-medium text-foreground mb-2">
                Técnico asignado <span className="text-error">*</span>
              </label>
              <select
                id="technician"
                value={technicianId ?? ''}
                disabled={!canManageAny}
                onChange={(event) => setTechnicianId(Number(event.target.value) || null)}
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Seleccione técnico</option>
                {technicians.map((technician) => (
                  <option key={technician.userId} value={technician.userId}>
                    {technician.name}
                    {technician.jobTitle ? ` — ${technician.jobTitle}` : ''}
                  </option>
                ))}
              </select>
              {!canManageAny && (
                <p className="caption text-xs text-muted-foreground mt-1">
                  Las citas se registran en tu propia agenda
                </p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-foreground mb-2">
                Fecha <span className="text-error">*</span>
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
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
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              />
            </div>
          </div>

          {/* Disponibilidad del día */}
          {technicianId && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="caption text-xs text-muted-foreground mb-2">
                Horarios ocupados de {selectedTechnician?.name ?? 'este técnico'} el {date}
              </p>
              {dayAppointments.length === 0 ? (
                <p className="text-sm text-success">Sin citas — todo el día disponible</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {dayAppointments.map((appointment) => (
                    <span
                      key={appointment.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-xs tabular-nums"
                    >
                      <Icon name="ClockIcon" size={12} />
                      {appointment.startTime}–{appointment.endTime}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Resumen */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 bg-card rounded-lg border border-border shadow-warm overflow-hidden">
          <div className="bg-primary/5 px-5 py-4 border-b border-border">
            <h3 className="font-heading text-lg font-semibold text-foreground">Resumen de la cita</h3>
          </div>

          <div className="p-5 space-y-4">
            {selectedServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Selecciona servicios para ver el resumen
              </p>
            ) : (
              <div className="space-y-2">
                {selectedServices.map((service) => {
                  const overridden = priceOverrides[Number(service.id)] !== undefined;
                  return (
                    <div key={service.id} className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => removeService(Number(service.id))}
                        className="mt-0.5 text-muted-foreground hover:text-error transition-smooth flex-shrink-0"
                        aria-label={`Quitar ${service.name}`}
                      >
                        <Icon name="XCircleIcon" size={16} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">{service.name}</p>
                        <p className="caption text-xs text-muted-foreground tabular-nums">
                          {service.duration} min{qtyOf(service) > 1 ? ` c/u · ${service.duration * qtyOf(service)} min total` : ''}
                        </p>
                        {/* Cantidad: el mismo servicio se puede agendar varias veces */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQty(Number(service.id), qtyOf(service) - 1)}
                            disabled={qtyOf(service) <= 1}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Disminuir cantidad"
                          >
                            <Icon name="MinusIcon" size={13} />
                          </button>
                          <span className="w-6 text-center text-sm font-medium text-foreground tabular-nums">{qtyOf(service)}</span>
                          <button
                            type="button"
                            onClick={() => setQty(Number(service.id), qtyOf(service) + 1)}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Aumentar cantidad"
                          >
                            <Icon name="PlusIcon" size={13} />
                          </button>
                        </div>
                      </div>
                      {priceEditorOpen ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="caption text-xs text-muted-foreground">L</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={effectivePrice(service)}
                            onChange={(event) => {
                              const value = event.target.value;
                              setPriceOverrides((prev) => {
                                const next = { ...prev };
                                if (value === '') {
                                  next[Number(service.id)] = 0;
                                } else {
                                  next[Number(service.id)] = Math.max(0, Number(value));
                                }
                                return next;
                              });
                            }}
                            className="w-20 px-2 h-8 rounded-md border border-input bg-background text-foreground text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        <p
                          className={`text-sm font-semibold tabular-nums flex-shrink-0 text-right ${
                            overridden ? 'text-primary' : 'text-foreground'
                          }`}
                          title={
                            qtyOf(service) > 1
                              ? `L ${effectivePrice(service).toLocaleString()} c/u`
                              : overridden
                                ? `Precio de catálogo: L ${service.price.toLocaleString()}`
                                : undefined
                          }
                        >
                          L {(effectivePrice(service) * qtyOf(service)).toLocaleString()}
                          {qtyOf(service) > 1 && (
                            <span className="block caption text-[11px] font-normal text-muted-foreground">
                              L {effectivePrice(service).toLocaleString()} × {qtyOf(service)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Cambiar precio es el ÚNICO ajuste manual del total, y no convive
                    con un código de descuento: se aplica uno u otro. */}
                {canModifyPricing && !appliedDiscount && (
                  <button
                    type="button"
                    onClick={() => setShowPriceEditor((prev) => !prev)}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Icon name={priceEditorOpen ? 'CheckIcon' : 'PencilSquareIcon'} size={15} />
                    {priceEditorOpen ? 'Listo' : 'Cambiar precio'}
                  </button>
                )}
                {canModifyPricing && appliedDiscount && (
                  <p className="mt-1 caption text-xs text-muted-foreground">
                    Hay un código de descuento aplicado. Quítalo para cambiar el precio.
                  </p>
                )}
                {Object.keys(priceOverrides).length > 0 && !priceEditorOpen && !appliedDiscount && (
                  <button
                    type="button"
                    onClick={() => {
                      setPriceOverrides({});
                      setPriceReason('');
                    }}
                    className="ml-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Restablecer
                  </button>
                )}

                {/* Motivo del cambio de precio: obligatorio para poder guardar. */}
                {canModifyPricing && hasPriceChange && (
                  <div className="pt-2">
                    <label htmlFor="priceReason" className="block caption text-xs text-muted-foreground mb-1">
                      Motivo del cambio de precio <span className="text-error">*</span>
                    </label>
                    <ReasonSelect
                      id="priceReason"
                      value={priceReason}
                      onChange={setPriceReason}
                      canManage={canModifyPricing}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duración total</span>
                <span className="font-medium text-foreground tabular-nums">{totalDuration} min</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Horario</span>
                <span className="font-medium text-foreground tabular-nums">
                  {totalDuration > 0 ? `${formatTimeLabel(startTime)} – ${formatTimeLabel(endTime)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profesional</span>
                <span className="font-medium text-foreground truncate ml-2">
                  {selectedTechnician?.name ?? '—'}
                </span>
              </div>
              {canSeeCommission && totalCommission > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Comisión</span>
                  <span className="font-medium text-success tabular-nums">
                    L {totalCommission.toLocaleString()}
                  </span>
                </div>
              )}
              {/* Código de descuento (solo con permiso para aplicarlo). Queda
                  bloqueado si ya se cambió el precio: es una vía o la otra. */}
              {canApplyDiscount && selectedServices.length > 0 && (
                <div className="pt-2 border-t border-border">
                  {hasPriceChange ? (
                    <p className="caption text-xs text-muted-foreground">
                      Esta cita tiene un cambio de precio. Restablece los precios para
                      aplicar un código de descuento.
                    </p>
                  ) : appliedDiscount ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <Icon name="TicketIcon" size={15} />
                        Descuento {appliedDiscount.code}
                        <button
                          type="button"
                          onClick={() => {
                            setAppliedDiscount(null);
                            setDiscountInput('');
                          }}
                          className="text-muted-foreground hover:text-error"
                          aria-label="Quitar descuento"
                        >
                          <Icon name="XMarkIcon" size={14} />
                        </button>
                      </span>
                      <span className="font-medium text-success tabular-nums">
                        − L {appliedDiscount.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block caption text-xs text-muted-foreground mb-1">Código de descuento</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={discountInput}
                          onChange={(event) => setDiscountInput(event.target.value.toUpperCase())}
                          onKeyDown={(event) => event.key === 'Enter' && applyDiscount()}
                          placeholder="Ej: SOUTH_10"
                          className="flex-1 px-3 h-10 rounded-lg border border-input bg-background text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                        />
                        <button
                          type="button"
                          onClick={applyDiscount}
                          disabled={isValidatingDiscount || !discountInput.trim()}
                          className="px-4 h-10 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isValidatingDiscount ? '...' : 'Aplicar'}
                        </button>
                      </div>
                      {discountError && (
                        <p className="mt-1 text-xs text-error flex items-center gap-1">
                          <Icon name="ExclamationCircleIcon" size={13} />
                          {discountError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(appliedDiscount || hasPriceChange) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-muted-foreground tabular-nums">
                    L {(hasPriceChange ? catalogTotal : totalPrice).toLocaleString()}
                  </span>
                </div>
              )}

              {hasPriceChange && (
                <div className="flex items-start justify-between text-sm">
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Cambio de precio</span>
                    {priceReason && (
                      <p className="caption text-xs text-muted-foreground truncate">{priceReason}</p>
                    )}
                  </div>
                  <span
                    className={`font-medium tabular-nums flex-shrink-0 ${
                      priceChangeAmount >= 0 ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {priceChangeAmount >= 0 ? '−' : '+'} L{' '}
                    {Math.abs(priceChangeAmount).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-heading text-xl font-bold text-primary tabular-nums">
                  L {finalTotal.toLocaleString()}
                </span>
              </div>

            </div>

            <div>
              <label htmlFor="status" className="block caption text-xs text-muted-foreground mb-1">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => setStatus(event.target.value as AppointmentStatus)}
                className="w-full px-3 h-10 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {STATUS_CONFIG[option].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="notes" className="block caption text-xs text-muted-foreground mb-1">
                Notas
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none text-sm"
                placeholder="Ej: prefiere tonos nude"
              />
            </div>

            {outsideSchedule && !conflict && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                <Icon name="ExclamationTriangleIcon" size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <span className="text-xs text-foreground">
                  El horario elegido queda fuera de la jornada del técnico.
                </span>
              </div>
            )}
            {conflict && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg flex items-start gap-2">
                <Icon name="ExclamationCircleIcon" size={16} className="text-error flex-shrink-0 mt-0.5" />
                <span className="text-xs text-error font-medium">
                  El técnico ya tiene una cita de {conflict.startTime} a {conflict.endTime}.
                </span>
              </div>
            )}
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
                <Icon name="ExclamationCircleIcon" size={16} className="text-error flex-shrink-0" />
                <span className="text-xs text-error font-medium">{error}</span>
              </div>
            )}

            <button
              onClick={() => handleSave('save')}
              disabled={isSaving || Boolean(conflict)}
              className="w-full h-12 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icon name="CheckCircleIcon" size={18} />
                  Crear Cita
                </>
              )}
            </button>

            {/* Ir a pagar: crea la cita y pasa directo al cobro. Solo para quien puede cobrar. */}
            {canCharge && (
              <button
                onClick={() => handleSave('pay')}
                disabled={isSaving || Boolean(conflict)}
                className="w-full h-12 px-4 bg-background border border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Icon name="BanknotesIcon" size={18} />
                Ir a pagar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Confirmación por WhatsApp. La cita ya está guardada: esto solo decide si se
        le avisa a la clienta ahora o más tarde. */}
    {confirmation && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden="true" />

        <div className="relative bg-card rounded-lg border border-border shadow-warm-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <Icon name="CheckCircleIcon" size={20} className="text-success" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Cita creada</h2>
              <p className="caption text-xs text-muted-foreground">
                Avísale a la clienta por WhatsApp
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="bg-card rounded-lg rounded-tl-none border border-border p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                  {confirmation.message}
                </p>
              </div>
            </div>

            {confirmation.url ? (
              <p className="caption text-xs text-muted-foreground">
                Se abrirá WhatsApp con el mensaje ya escrito. Solo tienes que darle enviar,
                y así sale de tu número y la clienta te puede responder.
              </p>
            ) : (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                <Icon
                  name="ExclamationTriangleIcon"
                  size={16}
                  className="text-warning flex-shrink-0 mt-0.5"
                />
                <span className="text-xs text-foreground">
                  Esta clienta no tiene un teléfono válido registrado, así que no se puede
                  abrir el chat. Puedes copiar el mensaje y enviarlo por otro medio.
                </span>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row gap-2">
            {confirmation.url && (
              <a
                href={confirmation.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={goToCalendar}
                className="flex-1 h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth flex items-center justify-center gap-2"
              >
                <Icon name="ChatBubbleLeftRightIcon" size={18} />
                Enviar por WhatsApp
              </a>
            )}
            <CopyButton text={confirmation.message} label="Copiar mensaje" />
            <button
              type="button"
              onClick={goToCalendar}
              className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AppointmentFormInteractive;
