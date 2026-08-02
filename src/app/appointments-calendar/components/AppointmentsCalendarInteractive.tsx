'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import PageHeader from '@/components/common/PageHeader';
import { useSession } from '@/lib/useSession';
import CalendarGrid from './CalendarGrid';
import CalendarMatrix from './CalendarMatrix';
import CalendarMonth from './CalendarMonth';
import { type ColumnTarget } from './DayColumn';
import AppointmentModal, { type AppointmentDraft } from './AppointmentModal';
import {
  STATUS_CONFIG,
  toIsoDate,
  addDays,
  startOfWeek,
  DAY_LABELS,
  MONTH_LABELS,
  type CalendarAppointment,
  type CalendarTechnician,
  type AppointmentStatus,
  type AvailabilityData,
} from './calendarConstants';

type ViewMode = 'day' | 'three-day' | 'week' | 'month';

const VIEW_LABELS: Record<ViewMode, string> = {
  day: 'Día',
  'three-day': '3 días',
  week: 'Semana',
  month: 'Mes',
};

const AppointmentsCalendarInteractive = () => {
  const router = useRouter();
  const { session, isLoading: isLoadingSession, can } = useSession();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [technicians, setTechnicians] = useState<CalendarTechnician[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    appointment: CalendarAppointment;
    column: ColumnTarget;
    startTime: string;
  } | null>(null);

  const canManageAny = can('appointments.manage.any');
  const canViewAny = can('appointments.view.any') || canManageAny;

  // Rango de fechas visible según la vista activa.
  // Días visibles. En vista mes es la cuadrícula completa: desde el lunes de la
  // primera semana hasta el domingo de la última, así se cargan también las citas
  // de los días de meses vecinos que aparecen en el borde.
  const rangeDates = useMemo(() => {
    if (viewMode === 'day') return [anchorDate];
    if (viewMode === 'three-day') return [0, 1, 2].map((i) => addDays(anchorDate, i));
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }

    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(startOfWeek(monthEnd), 6);
    const days: Date[] = [];
    for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) days.push(day);
    return days;
  }, [viewMode, anchorDate]);

  const from = toIsoDate(rangeDates[0]);
  const to = toIsoDate(rangeDates[rangeDates.length - 1]);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (technicianFilter !== 'all') params.set('technicianId', technicianFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const response = await fetch(`/api/appointments?${params}`);
      if (!response.ok) throw new Error('No se pudieron cargar las citas');
      setAppointments(await response.json());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las citas');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, technicianFilter, statusFilter]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    const loadReferenceData = async () => {
      const [teamRes, servicesRes, customersRes, schedulesRes] = await Promise.all([
        fetch('/api/team-members'),
        fetch('/api/services'),
        fetch('/api/customers'),
        fetch('/api/team-members/schedules'),
      ]);

      if (teamRes.ok) {
        const team = await teamRes.json();
        setTechnicians(
          team
            .filter((m: any) => m.isBookable && m.hasAccess)
            .map((m: any) => ({
              userId: m.userId,
              name: m.name,
              jobTitle: m.jobTitle,
              colorHex: m.colorHex,
            }))
        );
      }
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
      if (schedulesRes.ok) setAvailability(await schedulesRes.json());
    };

    loadReferenceData().catch(() => {});
  }, []);

  /**
   * Un técnico sin permiso amplio solo se ve a sí mismo. El servidor ya filtra
   * las citas; esto evita además dibujarle columnas de agendas ajenas vacías.
   */
  const visibleTechnicians = useMemo(() => {
    if (canViewAny) {
      return technicianFilter === 'all'
        ? technicians
        : technicians.filter((t) => String(t.userId) === technicianFilter);
    }
    return technicians.filter((t) => t.userId === session?.id);
  }, [technicians, technicianFilter, canViewAny, session]);

  const rangeIsoDates = useMemo(() => rangeDates.map(toIsoDate), [rangeDates]);

  const rangeLabel = useMemo(() => {
    if (viewMode === 'month') {
      return `${MONTH_LABELS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
    }
    const first = rangeDates[0];
    const last = rangeDates[rangeDates.length - 1];
    if (rangeDates.length === 1) {
      return `${DAY_LABELS[first.getDay()]} ${first.getDate()} de ${MONTH_LABELS[first.getMonth()]} ${first.getFullYear()}`;
    }
    return `${first.getDate()} de ${MONTH_LABELS[first.getMonth()]} – ${last.getDate()} de ${
      MONTH_LABELS[last.getMonth()]
    } ${last.getFullYear()}`;
  }, [rangeDates, viewMode, anchorDate]);

  // En vista mes se avanza de mes en mes; en las demás, por la cantidad de días visibles.
  const shiftRange = (direction: 1 | -1) => {
    setAnchorDate((current) =>
      viewMode === 'month'
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : addDays(current, direction * rangeDates.length)
    );
  };

  // La creación de citas vive ahora en su propia pantalla; el calendario solo
  // pasa el contexto (fecha, hora y técnico de la columna) por la URL.
  const openNewAppointment = (target: ColumnTarget, startTime: string) => {
    const params = new URLSearchParams({ date: target.date, time: startTime });
    const technicianId = canManageAny ? target.technicianId : session?.id ?? null;
    if (technicianId) params.set('technicianId', String(technicianId));
    router.push(`/new-appointment-creation?${params}`);
  };

  const openExistingAppointment = async (appointment: CalendarAppointment) => {
    const response = await fetch(`/api/appointments/${appointment.id}`);
    if (!response.ok) return;
    const detail = await response.json();
    // Precio APLICADO y ORIGINAL por servicio: al reabrir la cita se muestra lo que
    // realmente se cobró, no el precio vigente del catálogo.
    const servicePrices: Record<number, number> = {};
    const originalPrices: Record<number, number> = {};
    for (const line of detail.serviceLines ?? []) {
      servicePrices[Number(line.serviceId)] = Number(line.price);
      originalPrices[Number(line.serviceId)] = Number(line.originalPrice ?? line.catalogPrice);
    }
    setDraft({
      id: detail.id,
      customerId: detail.customerId,
      technicianId: detail.technicianId,
      date: detail.date,
      startTime: detail.startTime,
      status: detail.status,
      serviceIds: detail.serviceIds ?? [],
      notes: detail.notes ?? '',
      servicePrices,
      originalPrices,
      discounts: detail.discounts ?? [],
    });
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    const { appointment, column, startTime } = pendingMove;

    const payload: Record<string, unknown> = { date: column.date, startTime };
    // En vista día las columnas son técnicos, así que soltar en otra columna
    // también reasigna el técnico.
    if (column.technicianId !== null && column.technicianId !== appointment.technicianId) {
      payload.technicianId = column.technicianId;
    }

    const response = await fetch(`/api/appointments/${appointment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    setPendingMove(null);

    if (!response.ok) {
      setLoadError(result?.error || 'No se pudo mover la cita');
      return;
    }
    loadAppointments();
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:ml-[280px] min-h-screen">
          <div className="sticky top-0 z-30 bg-card border-b border-border h-20" />
          <div className="p-6 space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Agenda"
          actions={
            <button
              onClick={() =>
                openNewAppointment(
                  {
                    title: '',
                    date: toIsoDate(rangeDates[0]),
                    technicianId: canManageAny ? visibleTechnicians[0]?.userId ?? null : session?.id ?? null,
                  },
                  '09:00'
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="PlusIcon" size={20} />
              <span className="font-medium">Nueva cita</span>
            </button>
          }
        />

        <div className="p-6 space-y-4">
          {/* Navegación y vistas */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftRange(-1)}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Período anterior"
              >
                <Icon name="ChevronLeftIcon" size={18} className="text-foreground" />
              </button>
              <button
                onClick={() => setAnchorDate(new Date())}
                className="px-4 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Hoy
              </button>
              <button
                onClick={() => shiftRange(1)}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Período siguiente"
              >
                <Icon name="ChevronRightIcon" size={18} className="text-foreground" />
              </button>
              <div className="relative ml-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = dateInputRef.current;
                    if (el?.showPicker) el.showPicker();
                    else el?.focus();
                  }}
                  title="Ir a una fecha específica"
                  className="flex items-center gap-1.5 font-heading text-lg font-semibold text-foreground capitalize hover:text-primary transition-smooth focus:outline-none focus:ring-2 focus:ring-primary rounded-lg px-1"
                >
                  {rangeLabel}
                  <Icon name="CalendarDaysIcon" size={16} className="text-muted-foreground" />
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={toIsoDate(anchorDate)}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setAnchorDate(new Date(y, m - 1, d));
                  }}
                  className="absolute left-0 bottom-0 w-px h-px opacity-0 pointer-events-none"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-1">
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                    viewMode === mode
                      ? 'bg-primary text-primary-foreground shadow-warm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {VIEW_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-3">
            {canViewAny && (
              <div className="flex-1">
                <label htmlFor="technicianFilter" className="block caption text-xs text-muted-foreground mb-1">
                  Técnico
                </label>
                <select
                  id="technicianFilter"
                  value={technicianFilter}
                  onChange={(event) => setTechnicianFilter(event.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                >
                  <option value="all">Todos los técnicos</option>
                  {technicians.map((technician) => (
                    <option key={technician.userId} value={String(technician.userId)}>
                      {technician.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label htmlFor="statusFilter" className="block caption text-xs text-muted-foreground mb-1">
                Estado
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              >
                <option value="all">Todos los estados</option>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[])
                  .filter((status) => status !== 'inactive')
                  .map((status) => (
                    <option key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {(Object.keys(STATUS_CONFIG) as AppointmentStatus[])
              .filter((status) => status !== 'inactive')
              .map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[status].dot}`} />
                  <span className="caption text-xs text-muted-foreground">
                    {STATUS_CONFIG[status].label}
                  </span>
                </div>
              ))}
          </div>

          {loadError && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
              <span className="text-sm text-error font-medium">{loadError}</span>
            </div>
          )}

          {isLoading ? (
            <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
          ) : viewMode === 'month' ? (
            <CalendarMonth
              dates={rangeDates}
              currentMonth={anchorDate.getMonth()}
              appointments={appointments}
              onAppointmentClick={openExistingAppointment}
            />
          ) : viewMode === 'day' ? (
            <CalendarGrid
              technicians={visibleTechnicians}
              date={rangeIsoDates[0]}
              appointments={appointments}
              availability={availability}
              canDrag={can('appointments.manage.own') || canManageAny}
              onSlotClick={openNewAppointment}
              onAppointmentClick={openExistingAppointment}
              onAppointmentDrop={(appointment, column, startTime) =>
                setPendingMove({ appointment, column, startTime })
              }
            />
          ) : (
            <CalendarMatrix
              technicians={visibleTechnicians}
              dates={rangeIsoDates}
              appointments={appointments}
              availability={availability}
              canDrag={can('appointments.manage.own') || canManageAny}
              onSlotClick={openNewAppointment}
              onAppointmentClick={openExistingAppointment}
              onAppointmentDrop={(appointment, column, startTime) =>
                setPendingMove({ appointment, column, startTime })
              }
            />
          )}
        </div>
      </div>

      {draft && (
        <AppointmentModal
          draft={draft}
          technicians={technicians}
          services={services}
          customers={customers}
          canChooseTechnician={canManageAny}
          canModifyPricing={can('pricing.modify')}
          canApplyDiscount={can('discounts.apply')}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            loadAppointments();
          }}
        />
      )}

      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setPendingMove(null)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Icon name="ArrowsRightLeftIcon" size={24} className="text-accent" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                  ¿Desea cambiar la cita?
                </h3>
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium text-foreground">{pendingMove.appointment.customerName}</span>{' '}
                  se moverá al {pendingMove.column.date} a las {pendingMove.startTime}
                  {pendingMove.column.technicianId !== null &&
                    pendingMove.column.technicianId !== pendingMove.appointment.technicianId && (
                      <> con {pendingMove.column.title}</>
                    )}
                  .
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingMove(null)}
                className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
              >
                Cancelar
              </button>
              <button
                onClick={confirmMove}
                className="flex-1 h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth"
              >
                Sí, mover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsCalendarInteractive;
