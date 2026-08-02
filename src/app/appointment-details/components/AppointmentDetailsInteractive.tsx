'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppointmentHeader from './AppointmentHeader';
import ClientInfoCard from './ClientInfoCard';
import ServicesCard from './ServicesCard';
import AppointmentTimeline from './AppointmentTimeline';
import ActionButtons from './ActionButtons';
import CancellationModal from './CancellationModal';
import RescheduleModal from './RescheduleModal';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  image: string;
  alt: string;
  totalAppointments: number;
  lastVisit: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  details?: string;
}

interface AppointmentData {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive';
  date: string;
  time: string;
  client: ClientInfo;
  services: Service[];
  totalAmount: number;
  notes?: string;
  timeline: TimelineEvent[];
}

interface AppointmentDetailsInteractiveProps {
  appointmentData: AppointmentData;
}

const AppointmentDetailsInteractive = ({ appointmentData }: AppointmentDetailsInteractiveProps) => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleConfirm = () => {
    showNotification('Cita confirmada exitosamente');
    setTimeout(() => router.push('/appointments-management'), 1500);
  };

  const handleComplete = () => {
    showNotification('Cita marcada como completada');
    setTimeout(() => router.push('/appointments-management'), 1500);
  };

  const handleCancel = (reason: string) => {
    setIsCancelModalOpen(false);
    showNotification(`Cita cancelada: ${reason}`);
    setTimeout(() => router.push('/appointments-management'), 1500);
  };

  const handleReschedule = (date: string, time: string) => {
    setIsRescheduleModalOpen(false);
    showNotification(`Cita reprogramada para ${date} a las ${time}`);
    setTimeout(() => router.push('/appointments-management'), 1500);
  };

  const handleEdit = () => {
    router.push('/new-appointment-creation');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!isHydrated) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-card rounded-lg border border-border animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
            <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-card rounded-lg border border-border animate-pulse" />
            <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <AppointmentHeader
          appointmentId={appointmentData.id}
          status={appointmentData.status}
          date={appointmentData.date}
          time={appointmentData.time}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ServicesCard
              services={appointmentData.services}
              totalAmount={appointmentData.totalAmount}
              notes={appointmentData.notes}
            />

            <ActionButtons
              status={appointmentData.status}
              onConfirm={handleConfirm}
              onComplete={handleComplete}
              onCancel={() => setIsCancelModalOpen(true)}
              onReschedule={() => setIsRescheduleModalOpen(true)}
              onEdit={handleEdit}
              onPrint={handlePrint}
            />
          </div>

          <div className="space-y-6">
            <ClientInfoCard client={appointmentData.client} />
            <AppointmentTimeline events={appointmentData.timeline} />
          </div>
        </div>
      </div>

      <CancellationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancel}
        appointmentId={appointmentData.id}
      />

      <RescheduleModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        onConfirm={handleReschedule}
        appointmentId={appointmentData.id}
        currentDate={appointmentData.date}
        currentTime={appointmentData.time}
      />

      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className={`
            px-6 py-4 rounded-lg shadow-warm-lg border flex items-center gap-3
            ${toastType === 'success' ?'bg-success text-success-foreground border-success' :'bg-error text-error-foreground border-error'
            }
          `}>
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentDetailsInteractive;