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

interface CustomerTableProps {
  customers: Customer[];
  selectedIds: number[];
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: number) => void;
}

const CustomerTable = ({ customers, selectedIds, onSelectAll, onSelectOne }: CustomerTableProps) => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const allSelected = customers.length > 0 && selectedIds.length === customers.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < customers.length;

  const handleViewDetails = (id: number) => {
    router.push(`/customer-profile-details?id=${id}`);
  };

  const handleScheduleAppointment = (id: number) => {
    router.push(`/new-appointment-creation?customerId=${id}`);
  };

  const handleEdit = (id: number) => {
    router.push(`/customer-profile-creation?id=${id}`);
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
          </table>
        </div>
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
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Cliente</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Contacto</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Última Visita</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Citas</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Valor Total</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Estado</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className={`hover:bg-muted/30 transition-smooth ${
                  selectedIds.includes(customer.id) ? 'bg-primary/5' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(customer.id)}
                    onChange={() => handleCheckboxChange(customer.id)}
                    className="w-5 h-5 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 cursor-pointer"
                    aria-label={`Seleccionar ${customer.name}`}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                      <AppImage
                        src={customer.image}
                        alt={customer.imageAlt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="caption text-muted-foreground text-xs">
                        Desde {customer.registrationDate}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="caption text-foreground">{customer.email}</p>
                    <p className="caption text-muted-foreground text-xs">{customer.phone}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="caption text-foreground">{customer.lastVisit}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-data font-medium text-foreground">{customer.totalAppointments}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-data font-semibold text-primary">
                    L {customer.lifetimeValue.toLocaleString()}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <CustomerStatusBadge status={customer.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(customer.id)}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="Ver perfil"
                      title="Ver perfil"
                    >
                      <Icon name="EyeIcon" size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(customer.id)}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      aria-label="Editar perfil"
                      title="Editar perfil"
                    >
                      <Icon name="PencilSquareIcon" size={18} />
                    </button>
                    <button
                      onClick={() => handleScheduleAppointment(customer.id)}
                      className="p-2 rounded-lg hover:bg-accent/10 text-accent transition-smooth focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                      aria-label="Agendar cita"
                      title="Agendar cita"
                    >
                      <Icon name="CalendarIcon" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerTable;