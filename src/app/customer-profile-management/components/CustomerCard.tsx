'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import CustomerStatusBadge from './CustomerStatusBadge';

interface Customer {
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
}

interface CustomerCardProps {
  customer: Customer;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const CustomerCard = ({ customer, isSelected, onSelect }: CustomerCardProps) => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleViewDetails = () => {
    router.push(`/customer-profile-details?id=${customer.id}`);
  };

  const handleScheduleAppointment = () => {
    router.push(`/new-appointment-creation?customerId=${customer.id}`);
  };

  const handleEdit = () => {
    router.push(`/customer-profile-creation?id=${customer.id}`);
  };

  const handleCheckboxChange = () => {
    onSelect(customer.id);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 shadow-warm animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-muted"></div>
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-card rounded-lg border ${isSelected ? 'border-primary shadow-warm-md' : 'border-border shadow-warm'} transition-smooth`}>
      <div className="p-4">
        <div className="flex items-start gap-4 mb-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="mt-1 w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
            aria-label={`Seleccionar ${customer.name}`}
          />
          <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted">
            <AppImage
              src={customer.image}
              alt={customer.imageAlt}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground mb-1 truncate">{customer.name}</h3>
            <CustomerStatusBadge status={customer.status} />
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground caption">
            <Icon name="EnvelopeIcon" size={14} />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground caption">
            <Icon name="PhoneIcon" size={14} />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground caption">
            <Icon name="CalendarIcon" size={14} />
            <span>Última visita: {customer.lastVisit}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="caption text-muted-foreground text-xs mb-1">Citas</p>
            <p className="font-data font-semibold text-foreground">{customer.totalAppointments}</p>
          </div>
          <div>
            <p className="caption text-muted-foreground text-xs mb-1">Valor Total</p>
            <p className="font-data font-semibold text-primary">L {customer.lifetimeValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleViewDetails}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Icon name="EyeIcon" size={16} />
            <span className="caption font-medium">Ver Perfil</span>
          </button>
          <button
            onClick={handleEdit}
            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <Icon name="PencilSquareIcon" size={18} />
          </button>
          <button
            onClick={handleScheduleAppointment}
            className="p-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-smooth focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            aria-label="Agendar cita"
          >
            <Icon name="CalendarIcon" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard;