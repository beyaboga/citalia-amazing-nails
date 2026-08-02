'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import ClientInfoForm, { type ClientFormData } from './ClientInfoForm';
import ServiceSelection from './ServiceSelection';
import DateTimeScheduler from './DateTimeScheduler';
import AppointmentSummary from './AppointmentSummary';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

const NewAppointmentInteractive = () => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [clientData, setClientData] = useState<ClientFormData>({
    name: '',
    phone: '',
    email: ''
  });
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'pending' | 'confirmed' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleClientDataChange = (data: ClientFormData) => {
    setClientData(data);
  };

  const handleServicesChange = (services: Service[]) => {
    setSelectedServices(services);
  };

  const handleDateTimeChange = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const isFormValid = (): boolean => {
    return !!(
      clientData.name &&
      clientData.phone &&
      clientData.email &&
      selectedServices.length > 0 &&
      selectedDate &&
      selectedTime
    );
  };

  const handleSave = async (status: 'pending' | 'confirmed') => {
    if (!isFormValid()) {
      return;
    }

    setSaveStatus(status);
    setShowConfirmDialog(true);
  };

  const confirmSave = async () => {
    setIsSaving(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSaving(false);
    setShowConfirmDialog(false);
    router.push('/appointments-management');
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    router.push('/appointments-management');
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-20 bg-card border-b border-border animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-card rounded-lg animate-pulse" />
              <div className="h-96 bg-card rounded-lg animate-pulse" />
            </div>
            <div className="h-96 bg-card rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ClientInfoForm 
            onDataChange={handleClientDataChange}
            initialData={clientData}
          />
          
          <ServiceSelection 
            onServicesChange={handleServicesChange}
            selectedServices={selectedServices}
          />
          
          <DateTimeScheduler 
            onDateTimeChange={handleDateTimeChange}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleSave('confirmed')}
              disabled={!isFormValid()}
              className="flex-1 flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium shadow-warm hover:shadow-warm-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="CheckCircleIcon" size={20} />
              Guardar como Confirmada
            </button>
            
            <button
              onClick={() => handleSave('pending')}
              disabled={!isFormValid()}
              className="flex-1 flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-secondary text-secondary-foreground font-medium shadow-warm hover:shadow-warm-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
            >
              <Icon name="ClockIcon" size={20} />
              Guardar como Pendiente
            </button>
            
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="XMarkIcon" size={20} />
              Cancelar
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <AppointmentSummary
            clientData={clientData}
            services={selectedServices}
            date={selectedDate}
            time={selectedTime}
          />
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="QuestionMarkCircleIcon" size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">Confirmar Cita</h3>
                <p className="caption text-muted-foreground text-sm">
                  ¿Deseas crear esta cita como {saveStatus === 'confirmed' ? 'confirmada' : 'pendiente'}?
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium text-foreground">{clientData.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Servicios:</span>
                <span className="font-medium text-foreground">{selectedServices.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="data-text font-semibold text-primary">
                  L {selectedServices.reduce((sum, s) => sum + s.price, 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium shadow-warm hover:shadow-warm-md transition-smooth disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {isSaving ? (
                  <>
                    <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Icon name="CheckIcon" size={20} />
                    Confirmar
                  </>
                )}
              </button>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSaving}
                className="px-6 h-12 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-error" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">Cancelar Creación</h3>
                <p className="caption text-muted-foreground text-sm">
                  ¿Estás seguro de que deseas cancelar? Se perderán todos los datos ingresados.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmCancel}
                className="flex-1 flex items-center justify-center gap-2 px-6 h-12 rounded-lg bg-error text-error-foreground font-medium shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                <Icon name="XMarkIcon" size={20} />
                Sí, Cancelar
              </button>
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-6 h-12 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Continuar Editando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewAppointmentInteractive;