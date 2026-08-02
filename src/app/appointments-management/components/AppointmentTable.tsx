'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import StatusBadge from './StatusBadge';

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface Appointment {
  id: number;
  clientName: string;
  clientPhone: string;
  clientImage: string;
  clientImageAlt: string;
  date: string;
  time: string;
  services: Service[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive';
  totalDuration: number;
  totalPrice: number;
  notes?: string;
}

interface AppointmentTableProps {
  appointments: Appointment[];
  selectedIds: number[];
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: number) => void;
}

const AppointmentTable = ({ appointments, selectedIds, onSelectAll, onSelectOne }: AppointmentTableProps) => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const allSelected = appointments.length > 0 && selectedIds.length === appointments.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < appointments.length;

  const handleViewDetails = (id: number) => {
    router.push(`/appointment-details?id=${id}`);
  };

  const handleSelectAllChange = () => {
    onSelectAll(!allSelected);
  };

  const handleCheckboxChange = (id: number) => {
    onSelectOne(id);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left">
                  <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-muted rounded w-28 animate-pulse"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-6 py-4">
                    <div className="w-5 h-5 bg-muted rounded animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                        <div className="h-3 bg-muted rounded w-24 animate-pulse"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-40 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-28 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-muted rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-muted rounded-full w-24 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-warm p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon name="CalendarIcon" size={32} className="text-muted-foreground" />
        </div>
        <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
          No se encontraron citas
        </h3>
        <p className="text-muted-foreground mb-6">
          No hay citas que coincidan con los filtros seleccionados.
        </p>
        <button
          onClick={() => router.push('/new-appointment-creation')}
          className="inline-flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Icon name="PlusIcon" size={20} />
          Nueva cita
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={handleSelectAllChange}
                  className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                  aria-label="Seleccionar todas las citas"
                />
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Cliente
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Servicios
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Fecha y hora
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Duración
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Estado
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Total
              </th>
              <th className="px-6 py-4 text-left caption text-sm font-semibold text-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => (
              <tr
                key={appointment.id}
                className="border-b border-border hover:bg-muted/30 transition-smooth"
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(appointment.id)}
                    onChange={() => handleCheckboxChange(appointment.id)}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                    aria-label={`Seleccionar cita de ${appointment.clientName}`}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                      <AppImage
                        src={appointment.clientImage}
                        alt={appointment.clientImageAlt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{appointment.clientName}</p>
                      <p className="caption text-xs text-muted-foreground">{appointment.clientPhone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {appointment.services.slice(0, 2).map((service) => (
                      <p key={service.id} className="text-sm text-foreground">
                        {service.name}
                      </p>
                    ))}
                    {appointment.services.length > 2 && (
                      <p className="caption text-xs text-muted-foreground">
                        +{appointment.services.length - 2} más
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="text-sm text-foreground flex items-center gap-1.5">
                      <Icon name="CalendarIcon" size={14} className="text-muted-foreground" />
                      {appointment.date}
                    </p>
                    <p className="caption text-xs text-muted-foreground flex items-center gap-1.5">
                      <Icon name="ClockIcon" size={14} className="text-muted-foreground" />
                      {appointment.time}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-foreground">{appointment.totalDuration} min</p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={appointment.status} size="sm" />
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-sm text-primary">
                    L {appointment.totalPrice.toLocaleString('es-HN')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleViewDetails(appointment.id)}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <Icon name="EyeIcon" size={16} />
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AppointmentTable;