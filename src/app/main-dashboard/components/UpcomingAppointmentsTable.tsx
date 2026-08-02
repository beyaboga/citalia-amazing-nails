'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import StatusBadge from './StatusBadge';

interface Appointment {
  id: number;
  clientName: string;
  service: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  phone: string | null;
}

interface UpcomingAppointmentsTableProps {
  appointments: Appointment[];
  onRefresh: () => void | Promise<void>;
}

const UpcomingAppointmentsTable = ({ appointments, onRefresh }: UpcomingAppointmentsTableProps) => {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleConfirm = async (id: number) => {
    setLoadingAction(`confirm-${id}`);
    setError('');
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'No se pudo confirmar la cita');
      await onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo confirmar la cita');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReschedule = (id: number) => {
    router.push(`/appointment-details?id=${id}&action=reschedule`);
  };

  const handleViewDetails = (id: number) => {
    router.push(`/appointment-details?id=${id}`);
  };

  return (
    <div className="bg-card rounded-lg shadow-warm border border-border overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-heading font-semibold text-foreground mb-1">
              Próximas Citas
            </h3>
            <p className="caption text-muted-foreground">Citas programadas para hoy</p>
          </div>
          <button
            onClick={() => router.push('/appointments-management')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Ver todas
            <Icon name="ArrowRightIcon" size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="text-error flex-shrink-0" />
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                Servicio
              </th>
              <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                Hora
              </th>
              <th className="px-6 py-3 text-left caption font-semibold text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right caption font-semibold text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-muted/30 transition-smooth">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-foreground">{appointment.clientName}</p>
                    <p className="caption text-muted-foreground">{appointment.phone}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-foreground">{appointment.service}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-foreground">
                    <Icon name="ClockIcon" size={16} className="text-muted-foreground" />
                    {appointment.time}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={appointment.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {appointment.status === 'pending' && (
                      <button
                        onClick={() => handleConfirm(appointment.id)}
                        disabled={loadingAction === `confirm-${appointment.id}`}
                        className="p-2 rounded-lg text-success hover:bg-success/10 transition-smooth focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 disabled:opacity-50"
                        aria-label="Confirmar cita"
                      >
                        {loadingAction === `confirm-${appointment.id}` ? (
                          <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                        ) : (
                          <Icon name="CheckIcon" size={18} />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleReschedule(appointment.id)}
                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="Reprogramar cita"
                    >
                      <Icon name="CalendarIcon" size={18} />
                    </button>
                    <button
                      onClick={() => handleViewDetails(appointment.id)}
                      className="p-2 rounded-lg text-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="Ver detalles"
                    >
                      <Icon name="EyeIcon" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-border">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="font-medium text-foreground mb-1">{appointment.clientName}</p>
                <p className="caption text-muted-foreground">{appointment.phone}</p>
              </div>
              <StatusBadge status={appointment.status} />
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Icon name="SparklesIcon" size={16} className="text-muted-foreground" />
                {appointment.service}
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Icon name="ClockIcon" size={16} className="text-muted-foreground" />
                {appointment.time}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {appointment.status === 'pending' && (
                <button
                  onClick={() => handleConfirm(appointment.id)}
                  disabled={loadingAction === `confirm-${appointment.id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground font-medium text-sm hover:bg-success/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 disabled:opacity-50"
                >
                  {loadingAction === `confirm-${appointment.id}` ? (
                    <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Icon name="CheckIcon" size={18} />
                      Confirmar
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => handleReschedule(appointment.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Icon name="CalendarIcon" size={18} />
                Reprogramar
              </button>
              <button
                onClick={() => handleViewDetails(appointment.id)}
                className="px-4 py-2 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Ver
              </button>
            </div>
          </div>
        ))}
      </div>

      {appointments.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Icon name="CalendarIcon" size={32} className="text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">No hay citas programadas</p>
          <p className="caption text-muted-foreground">Las próximas citas aparecerán aquí</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingAppointmentsTable;