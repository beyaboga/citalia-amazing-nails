'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  searchQuery: string;
}

const ITEMS_PER_PAGE = 10;

const mockAppointments: Appointment[] = [
  {
    id: 1,
    clientName: "María González",
    clientPhone: "+504 9876-5432",
    clientImage: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg",
    clientImageAlt: "Professional woman with long brown hair wearing white blouse smiling at camera",
    date: "22/01/2026",
    time: "10:00 AM",
    services: [
      { id: 1, name: "Manicure Clásico", duration: 45, price: 250 },
      { id: 2, name: "Pedicure Spa", duration: 60, price: 350 }
    ],
    status: "confirmed",
    totalDuration: 105,
    totalPrice: 600,
    notes: "Cliente prefiere colores neutros"
  },
  {
    id: 2,
    clientName: "Ana Rodríguez",
    clientPhone: "+504 8765-4321",
    clientImage: "https://images.pixabay.com/photo/2016/11/29/03/35/girl-1867092_1280.jpg",
    clientImageAlt: "Young woman with curly dark hair wearing casual denim jacket outdoors",
    date: "22/01/2026",
    time: "11:30 AM",
    services: [
      { id: 3, name: "Uñas Acrílicas", duration: 90, price: 450 }
    ],
    status: "pending",
    totalDuration: 90,
    totalPrice: 450
  },
  {
    id: 3,
    clientName: "Carmen López",
    clientPhone: "+504 7654-3210",
    clientImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    clientImageAlt: "Elegant woman with blonde hair in professional attire against neutral background",
    date: "22/01/2026",
    time: "02:00 PM",
    services: [
      { id: 4, name: "Semipermanente", duration: 60, price: 300 },
      { id: 5, name: "Diseño de Uñas", duration: 30, price: 150 }
    ],
    status: "confirmed",
    totalDuration: 90,
    totalPrice: 450
  },
  {
    id: 4,
    clientName: "Laura Martínez",
    clientPhone: "+504 6543-2109",
    clientImage: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg",
    clientImageAlt: "Smiling woman with shoulder-length brown hair wearing striped top",
    date: "23/01/2026",
    time: "09:00 AM",
    services: [
      { id: 6, name: "Polygel", duration: 120, price: 550 }
    ],
    status: "pending",
    totalDuration: 120,
    totalPrice: 550
  },
  {
    id: 5,
    clientName: "Patricia Hernández",
    clientPhone: "+504 5432-1098",
    clientImage: "https://images.pixabay.com/photo/2017/08/06/12/52/woman-2592247_1280.jpg",
    clientImageAlt: "Professional woman with dark hair in business suit with confident expression",
    date: "23/01/2026",
    time: "11:00 AM",
    services: [
      { id: 7, name: "Manicure Francesa", duration: 50, price: 280 }
    ],
    status: "completed",
    totalDuration: 50,
    totalPrice: 280
  },
  {
    id: 6,
    clientName: "Rosa Sánchez",
    clientPhone: "+504 4321-0987",
    clientImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    clientImageAlt: "Young woman with long dark hair wearing casual white t-shirt outdoors",
    date: "23/01/2026",
    time: "03:00 PM",
    services: [
      { id: 8, name: "Pedicure Clásico", duration: 45, price: 250 },
      { id: 9, name: "Tratamiento Hidratante", duration: 20, price: 100 }
    ],
    status: "confirmed",
    totalDuration: 65,
    totalPrice: 350
  },
  {
    id: 7,
    clientName: "Elena Torres",
    clientPhone: "+504 3210-9876",
    clientImage: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg",
    clientImageAlt: "Woman with red hair wearing glasses and casual sweater smiling warmly",
    date: "24/01/2026",
    time: "10:30 AM",
    services: [
      { id: 10, name: "Reforzamiento de Uñas", duration: 75, price: 400 }
    ],
    status: "pending",
    totalDuration: 75,
    totalPrice: 400
  },
  {
    id: 8,
    clientName: "Sofía Ramírez",
    clientPhone: "+504 2109-8765",
    clientImage: "https://images.pixabay.com/photo/2016/11/21/12/42/beard-1845166_1280.jpg",
    clientImageAlt: "Stylish woman with short dark hair wearing black turtleneck with artistic makeup",
    date: "24/01/2026",
    time: "01:00 PM",
    services: [
      { id: 11, name: "Manicure Gel", duration: 55, price: 320 }
    ],
    status: "cancelled",
    totalDuration: 55,
    totalPrice: 320
  },
  {
    id: 9,
    clientName: "Gabriela Flores",
    clientPhone: "+504 1098-7654",
    clientImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    clientImageAlt: "Professional woman with long dark hair in business attire with natural smile",
    date: "24/01/2026",
    time: "04:00 PM",
    services: [
      { id: 12, name: "Pedicure Spa Premium", duration: 75, price: 450 },
      { id: 13, name: "Masaje de Pies", duration: 30, price: 150 }
    ],
    status: "confirmed",
    totalDuration: 105,
    totalPrice: 600
  },
  {
    id: 10,
    clientName: "Daniela Castro",
    clientPhone: "+504 0987-6543",
    clientImage: "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg",
    clientImageAlt: "Young woman with wavy brown hair wearing denim jacket with bright smile",
    date: "25/01/2026",
    time: "09:30 AM",
    services: [
      { id: 14, name: "Uñas Acrílicas con Diseño", duration: 120, price: 600 }
    ],
    status: "pending",
    totalDuration: 120,
    totalPrice: 600
  },
  {
    id: 11,
    clientName: "Valentina Morales",
    clientPhone: "+504 9876-5433",
    clientImage: "https://images.pixabay.com/photo/2017/06/26/02/47/person-2442565_1280.jpg",
    clientImageAlt: "Woman with long blonde hair wearing casual white top with natural makeup",
    date: "25/01/2026",
    time: "12:00 PM",
    services: [
      { id: 15, name: "Semipermanente Premium", duration: 70, price: 380 }
    ],
    status: "confirmed",
    totalDuration: 70,
    totalPrice: 380
  },
  {
    id: 12,
    clientName: "Isabella Vargas",
    clientPhone: "+504 8765-4322",
    clientImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    clientImageAlt: "Professional woman with dark hair in elegant black dress with confident pose",
    date: "25/01/2026",
    time: "03:30 PM",
    services: [
      { id: 16, name: "Manicure Clásico", duration: 45, price: 250 }
    ],
    status: "inactive",
    totalDuration: 45,
    totalPrice: 250
  }
];

const AppointmentsInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>(mockAppointments);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    searchQuery: ''
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const applyFilters = useCallback((filterState: FilterState) => {
    let filtered = [...appointments];

    if (filterState.searchQuery) {
      const query = filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.clientName.toLowerCase().includes(query) ||
        apt.clientPhone.includes(query)
      );
    }

    if (filterState.status !== 'all') {
      filtered = filtered.filter(apt => apt.status === filterState.status);
    }

    if (filterState.dateFrom) {
      filtered = filtered.filter(apt => {
        const aptDate = apt.date.split('/').reverse().join('-');
        return aptDate >= filterState.dateFrom;
      });
    }

    if (filterState.dateTo) {
      filtered = filtered.filter(apt => {
        const aptDate = apt.date.split('/').reverse().join('-');
        return aptDate <= filterState.dateTo;
      });
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  }, [appointments]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    applyFilters(newFilters);
  }, [applyFilters]);

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const currentPageIds = paginatedAppointments.map(apt => apt.id);
      setSelectedIds(currentPageIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleStatusChange = (status: string) => {
    setAppointments(prev =>
      prev.map(apt =>
        selectedIds.includes(apt.id)
          ? { ...apt, status: status as Appointment['status'] }
          : apt
      )
    );
    applyFilters(filters);
    setSelectedIds([]);
  };

  const handleDelete = () => {
    setAppointments(prev => prev.filter(apt => !selectedIds.includes(apt.id)));
    applyFilters(filters);
    setSelectedIds([]);
  };

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!isHydrated) {
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