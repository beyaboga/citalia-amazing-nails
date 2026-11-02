'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import { formatDateDMY, formatTime12, toLocalDateString } from '@/lib/localDate';
import {
  buildWhatsAppUrl,
  formatDateForMessage,
  renderTemplate,
  type WhatsAppTemplate,
} from '@/lib/whatsapp';

interface ReminderAppointment {
  id: number;
  customerName: string;
  customerPhone: string | null;
  technicianName: string | null;
  date: string;
  startTime: string;
  status: string;
  durationMinutes: number;
  totalPrice: number;
  services: string[];
}

// Solo las citas que siguen en pie: a una cancelada o ya atendida no se le recuerda nada.
const REMINDABLE = ['pending', 'confirmed'];
const SENT_STORAGE_KEY = 'appointmentRemindersSent';

const shiftDay = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toLocalDateString(new Date(y, m - 1, d + days));
};

// Una cita reprogramada cambia de fecha u hora, y entonces vuelve a necesitar su aviso.
const sentKey = (a: ReminderAppointment) => `${a.id}|${a.date}|${a.startTime}`;

const readSent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SENT_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const AppointmentRemindersInteractive = () => {
  const { can, isLoading: sessionLoading } = useSession();
  const canView = can('customers.manage');

  const [date, setDate] = useState(() => shiftDay(toLocalDateString(), 1));
  const [appointments, setAppointments] = useState<ReminderAppointment[]>([]);
  const [template, setTemplate] = useState<WhatsAppTemplate | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSent(readSent());
    fetch('/api/whatsapp-templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: WhatsAppTemplate[]) =>
        setTemplate(Array.isArray(rows) ? rows.find((t) => t.event === 'reminder') ?? null : null)
      )
      .catch(() => setTemplate(null));
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/appointments?${new URLSearchParams({ from: date, to: date })}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las citas');
      setAppointments((data as ReminderAppointment[]).filter((a) => REMINDABLE.includes(a.status)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las citas');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (canView) load();
  }, [canView, load]);

  const sendReminder = (appointment: ReminderAppointment) => {
    if (!template) return;
    const message = renderTemplate(template.body, {
      cliente: appointment.customerName.split(' ')[0],
      fecha: formatDateForMessage(appointment.date),
      hora: formatTime12(appointment.startTime),
      servicios: appointment.services.join('\n'),
      profesional: appointment.technicianName ?? '',
      total: `L ${appointment.totalPrice.toLocaleString()}`,
    });
    const url = buildWhatsAppUrl(appointment.customerPhone, message);
    if (!url) {
      alert('Esta clienta no tiene un teléfono válido registrado.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');

    const next = Array.from(new Set([...readSent(), sentKey(appointment)]));
    setSent(next);
    try {
      localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento solo se pierde la marca de "enviado".
    }
  };

  const pendingCount = useMemo(
    () => appointments.filter((a) => !sent.includes(sentKey(a))).length,
    [appointments, sent]
  );

  if (!sessionLoading && !canView) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="LockClosedIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">Sin acceso</h3>
        <p className="caption text-muted-foreground">No tiene permiso para ver los recordatorios.</p>
      </div>
    );
  }

  const tomorrow = shiftDay(toLocalDateString(), 1);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-1">
              Citas del {formatDateDMY(date)}
              {date === tomorrow && <span className="caption text-muted-foreground ml-2">(mañana)</span>}
            </h2>
            <p className="caption text-muted-foreground">
              Toque el botón de WhatsApp para abrir el chat con el recordatorio ya escrito. El
              texto se edita en Configuración → Mensajes WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDate(shiftDay(date, -1))}
              className="h-10 w-10 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center"
              aria-label="Día anterior"
            >
              <Icon name="ChevronLeftIcon" size={18} />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="h-10 px-3 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setDate(shiftDay(date, 1))}
              className="h-10 w-10 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center"
              aria-label="Día siguiente"
            >
              <Icon name="ChevronRightIcon" size={18} />
            </button>
            {date !== tomorrow && (
              <button
                type="button"
                onClick={() => setDate(tomorrow)}
                className="h-10 px-4 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted"
              >
                Mañana
              </button>
            )}
          </div>
        </div>
      </div>

      {template && !template.enabled && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-sm text-foreground">
          El mensaje de recordatorio está apagado en Configuración → Mensajes WhatsApp. Enciéndalo
          para poder enviarlo.
        </div>
      )}

      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">
            {appointments.length} cita{appointments.length === 1 ? '' : 's'}
          </h3>
          <span className="caption text-muted-foreground">
            {pendingCount === 0 && appointments.length > 0
              ? 'Todos los avisos enviados'
              : `${pendingCount} por avisar`}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Icon name="ArrowPathIcon" size={24} className="animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No hay citas por recordar para este día.</p>
        ) : (
          <ul className="divide-y divide-border">
            {appointments.map((a) => {
              const wasSent = sent.includes(sentKey(a));
              const noPhone = !a.customerPhone;
              return (
                <li key={a.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
                  <div className="w-24 flex-shrink-0 font-medium text-foreground">
                    {formatTime12(a.startTime)}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-medium text-foreground">{a.customerName}</p>
                    <p className="caption text-muted-foreground">
                      {a.services.join(', ')}
                      {a.technicianName ? ` · ${a.technicianName}` : ''}
                    </p>
                    {noPhone && <p className="caption text-error">Sin teléfono registrado</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {wasSent && (
                      <span className="flex items-center gap-1 text-sm text-success font-medium">
                        <Icon name="CheckCircleIcon" size={18} /> Enviado
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => sendReminder(a)}
                      disabled={noPhone || !template?.enabled}
                      className="h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Icon name="ChatBubbleLeftRightIcon" size={18} />
                      {wasSent ? 'Enviar de nuevo' : 'Enviar recordatorio'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AppointmentRemindersInteractive;
