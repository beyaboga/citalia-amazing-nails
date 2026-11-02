'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDateDMY, formatTime12 } from '@/lib/localDate';
import AppointmentHeader from './AppointmentHeader';
import ClientInfoCard from './ClientInfoCard';
import ServicesCard from './ServicesCard';
import ActionButtons from './ActionButtons';
import CancellationModal from './CancellationModal';
import RescheduleModal from './RescheduleModal';

type Status = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive' | 'in_progress' | 'no_show';

/** Cita tal como la devuelve GET /api/appointments/[id]. */
interface AppointmentData {
  id: number;
  customerName: string;
  customerPhone: string | null;
  technicianName: string | null;
  date: string;
  startTime: string;
  status: Status;
  totalPrice: number;
  notes: string | null;
  serviceLines: { serviceId: number; name: string; price: number; duration: number | null }[];
}

const AppointmentDetailsInteractive = () => {
  const router = useRouter();
  const appointmentId = Number(useSearchParams().get('id'));
  const wantsReschedule = useSearchParams().get('action') === 'reschedule';

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const load = useCallback(async () => {
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      setLoadError('No se indicó qué cita mostrar.');
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la cita');
      setAppointment(data);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'No se pudo cargar la cita');
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Llegar desde "Reprogramar" del dashboard abre directamente el selector de fecha.
  useEffect(() => {
    if (appointment && wantsReschedule) setIsRescheduleModalOpen(true);
  }, [appointment, wantsReschedule]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  /** Guarda cambios en la cita; muestra el error real del servidor si falla. */
  const patch = async (body: Record<string, unknown>, successMessage: string) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || 'No se pudo guardar el cambio');
      showNotification(successMessage);
      await load();
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'No se pudo guardar el cambio', 'error');
    }
  };

  const handleConfirm = () => patch({ status: 'confirmed' }, 'Cita confirmada');

  const handleComplete = () => patch({ status: 'completed' }, 'Cita marcada como completada');

  const handleCancel = (reason: string) => {
    setIsCancelModalOpen(false);
    const note = `Cancelada: ${reason}`;
    patch(
      { status: 'cancelled', notes: appointment?.notes ? `${appointment.notes}\n${note}` : note },
      'Cita cancelada'
    );
  };

  const handleReschedule = (date: string, time: string) => {
    setIsRescheduleModalOpen(false);
    patch({ date, startTime: time }, `Cita reprogramada para ${formatDateDMY(date)} a las ${formatTime12(time)}`);
  };

  const handleEdit = () => {
    router.push('/appointments-calendar');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-card rounded-lg border border-border animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-card rounded-lg border border-border animate-pulse" />
          <div className="h-48 bg-card rounded-lg border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError || !appointment) {
    return (
      <div className="bg-card rounded-lg border border-border p-10 text-center">
        <p className="text-foreground font-medium mb-4">{loadError || 'Cita no encontrada'}</p>
        <button
          type="button"
          onClick={() => router.push('/appointments-management')}
          className="h-10 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth"
        >
          Volver a las citas
        </button>
      </div>
    );
  }

  const services = appointment.serviceLines.map((line) => ({
    id: String(line.serviceId),
    name: line.name,
    duration: line.duration ?? 0,
    price: line.price,
  }));

  return (
    <>
      <div className="space-y-6">
        <AppointmentHeader
          appointmentId={String(appointment.id)}
          status={appointment.status}
          date={formatDateDMY(appointment.date)}
          time={formatTime12(appointment.startTime)}
          technicianName={appointment.technicianName}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ServicesCard
              services={services}
              totalAmount={appointment.totalPrice}
              notes={appointment.notes ?? undefined}
            />

            <ActionButtons
              status={appointment.status}
              onConfirm={handleConfirm}
              onComplete={handleComplete}
              onCancel={() => setIsCancelModalOpen(true)}
              onReschedule={() => setIsRescheduleModalOpen(true)}
              onEdit={handleEdit}
              onPrint={handlePrint}
            />
          </div>

          <div className="space-y-6">
            <ClientInfoCard
              client={{ name: appointment.customerName, phone: appointment.customerPhone }}
            />
          </div>
        </div>
      </div>

      <CancellationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancel}
        appointmentId={String(appointment.id)}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onConfirm={handleReschedule}
        appointmentId={String(appointment.id)}
        currentDate={formatDateDMY(appointment.date)}
        currentTime={formatTime12(appointment.startTime)}
      />

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`px-6 py-4 rounded-lg shadow-warm-lg border flex items-center gap-3 ${
              toastType === 'success'
                ? 'bg-success text-success-foreground border-success'
                : 'bg-error text-error-foreground border-error'
            }`}
          >
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentDetailsInteractive;
