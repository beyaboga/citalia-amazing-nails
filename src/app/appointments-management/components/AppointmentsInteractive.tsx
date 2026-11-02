'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDateDMY, formatTime12, toLocalDateString } from '@/lib/localDate';
import AppointmentFilters from './AppointmentFilters';
import AppointmentTable from './AppointmentTable';
import AppointmentCard from './AppointmentCard';
import BulkActionsBar from './BulkActionsBar';
import Pagination from './Pagination';

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
  technicianName: string | null;
  date: string;
  /** Fecha ISO (YYYY-MM-DD), para filtrar sin depender del formato mostrado. */
  isoDate: string;
  time: string;
  services: Service[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'inactive' | 'in_progress' | 'no_show';
  totalDuration: number;
  totalPrice: number;
  notes?: string;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  searchQuery: string;
}

/** Fila de GET /api/appointments. */
interface ApiAppointment {
  id: number;
  customerName: string;
  customerPhone: string | null;
  technicianName: string | null;
  date: string;
  startTime: string;
  status: Appointment['status'];
  durationMinutes: number;
  totalPrice: number;
  notes: string | null;
  services: string[];
}

const ITEMS_PER_PAGE = 10;
// La lista carga una ventana alrededor de hoy: un mes atrás y seis meses adelante.
const DAYS_BACK = 30;
const DAYS_AHEAD = 180;

const shiftDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateString(d);
};

const toAppointment = (row: ApiAppointment): Appointment => ({
  id: row.id,
  clientName: row.customerName,
  clientPhone: row.customerPhone ?? '',
  technicianName: row.technicianName,
  date: formatDateDMY(row.date),
  isoDate: row.date,
  time: formatTime12(row.startTime),
  // La lista solo trae los nombres de los servicios; el detalle completo está en "Ver".
  services: row.services.map((name, index) => ({ id: index, name, duration: 0, price: 0 })),
  status: row.status,
  totalDuration: row.durationMinutes,
  totalPrice: row.totalPrice,
  notes: row.notes ?? undefined,
});

const AppointmentsInteractive = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    searchQuery: ''
  });

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ from: shiftDays(-DAYS_BACK), to: shiftDays(DAYS_AHEAD) });
      const res = await fetch(`/api/appointments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las citas');
      // Las más próximas primero: la lista sirve para ver lo que viene.
      setAppointments((data as ApiAppointment[]).map(toAppointment));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las citas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.clientName.toLowerCase().includes(query) ||
          apt.clientPhone.includes(query) ||
          (apt.technicianName ?? '').toLowerCase().includes(query)
      );
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter((apt) => apt.status === filters.status);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter((apt) => apt.isoDate >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter((apt) => apt.isoDate <= filters.dateTo);
    }
    return filtered;
  }, [appointments, filters]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSelectAll = (selected: boolean) => {
    setSelectedIds(selected ? paginatedAppointments.map((apt) => apt.id) : []);
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleStatusChange = async (status: string) => {
    setError('');
    const results = await Promise.all(
      selectedIds.map(async (id) => {
        const res = await fetch(`/api/appointments/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        return res.ok ? null : ((await res.json())?.error as string | undefined) || 'Error al actualizar';
      })
    );
    const failures = results.filter((r) => r !== null);
    if (failures.length > 0) {
      setError(`No se pudieron actualizar ${failures.length} cita(s): ${failures[0]}`);
    }
    setSelectedIds([]);
    await load();
  };

  // No hay endpoint para borrar citas (el historial de pagos y comisiones depende de
  // ellas); lo que corresponde es marcarlas como canceladas.
  const handleDelete = () => {
    setError('Las citas no se eliminan: cámbiales el estado a "Cancelada" para quitarlas de la agenda.');
    setSelectedIds([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 shadow-warm animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
          <span className="text-sm text-error font-medium">{error}</span>
        </div>
      )}

      <AppointmentFilters
        onFilterChange={handleFilterChange}
        totalCount={appointments.length}
        filteredCount={filteredAppointments.length}
      />

      <div className="hidden lg:block">
        <AppointmentTable
          appointments={paginatedAppointments}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
        />
      </div>

      <div className="lg:hidden space-y-4">
        {paginatedAppointments.map(appointment => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            isSelected={selectedIds.includes(appointment.id)}
            onSelect={handleSelectOne}
          />
        ))}
      </div>

      {filteredAppointments.length > ITEMS_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={filteredAppointments.length}
        />
      )}

      <BulkActionsBar
        selectedCount={selectedIds.length}
        onClearSelection={handleClearSelection}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default AppointmentsInteractive;
