'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import CustomerInfoPanel from './CustomerInfoPanel';
import AppointmentHistorySection from './AppointmentHistorySection';
import ServicePreferencesPanel from './ServicePreferencesPanel';
import CategoryFollowupSection from './CategoryFollowupSection';
import NotesSection from './NotesSection';
import PageHeader from '@/components/common/PageHeader';

interface CustomerDetails {
  id: number;
  name: string;
  email: string;
  phone: string;
  image: string;
  imageAlt: string;
  status: 'active' | 'inactive' | 'vip';
  registrationDate: string;
  lastVisit: string;
  totalAppointments: number;
  lifetimeValue: number;
  servicePreferences: string[];
  birthday?: string;
  birthdayIso?: string;
  address?: string;
  preferredContactMethods: string[];
  loyaltyPoints: number;
  allergies?: string;
  specialRequirements?: string;
}

interface AppointmentHistory {
  id: number;
  date: string;
  time: string;
  services: string[];
  technician: string;
  cost: number;
  rating?: number;
  notes?: string;
}

const CustomerProfileDetailsInteractive = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const [isHydrated, setIsHydrated] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistory[]>([]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!customerId) {
      setLoadError('No se especificó un cliente');
      setIsLoading(false);
      return;
    }

    const loadCustomer = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/customers/${customerId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'No se pudo cargar el cliente');
        setCustomer(result);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el cliente');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomer();
  }, [customerId]);

  const handleScheduleAppointment = () => {
    router.push(`/new-appointment-creation?customerId=${customerId}`);
  };

  const handleSendMessage = () => {
    if (!customer?.phone) return;
    window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  const handleEditProfile = () => {
    if (!customer) return;
    router.push(`/customer-profile-creation?id=${customer.id}`);
  };

  const handleBack = () => {
    router.push('/customer-profile-management');
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 bg-muted rounded animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-muted rounded animate-pulse"></div>
            <div className="lg:col-span-2 h-96 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !customer) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-error/10 border border-error text-error rounded-lg p-6">
            <p className="font-medium mb-2">{loadError || 'No se pudo cargar el cliente'}</p>
            <button onClick={handleBack} className="text-sm underline">
              Volver a la lista de clientes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Perfil del Cliente"
          leading={
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Volver"
            >
              <Icon name="ArrowLeftIcon" size={20} className="text-foreground" />
            </button>
          }
        />

        <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-muted-foreground">Información completa y historial de servicios</p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleScheduleAppointment}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="CalendarIcon" size={20} />
              <span className="font-medium">Agendar Cita</span>
            </button>
            <button
              onClick={handleEditProfile}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-lg hover:bg-muted shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="PencilIcon" size={20} />
              <span className="font-medium">Editar Perfil</span>
            </button>
            <button
              onClick={handleSendMessage}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-success text-success-foreground rounded-lg hover:bg-success/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2"
            >
              <Icon name="ChatBubbleLeftRightIcon" size={20} />
              <span className="font-medium">Enviar Mensaje</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <CustomerInfoPanel customer={customer} />
              <ServicePreferencesPanel
                preferences={customer.servicePreferences}
                allergies={customer.allergies}
                specialRequirements={customer.specialRequirements}
              />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <CategoryFollowupSection customerId={customer.id} />
              <AppointmentHistorySection appointments={appointmentHistory} />
              <NotesSection customerId={customer.id} />
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileDetailsInteractive;