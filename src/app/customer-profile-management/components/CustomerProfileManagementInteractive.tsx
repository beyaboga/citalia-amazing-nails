'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CustomerFilters from './CustomerFilters';
import CustomerTable from './CustomerTable';
import CustomerCard from './CustomerCard';
import BulkActionsBar from './BulkActionsBar';
import Pagination from './Pagination';
import Icon from '@/components/ui/AppIcon';
import PageHeader from '@/components/common/PageHeader';

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
  birthday?: string;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  searchQuery: string;
  spendingTier: string;
}

const ITEMS_PER_PAGE = 10;

const CustomerProfileManagementInteractive = () => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) throw new Error('No se pudo cargar la lista de clientes');
        const data: Customer[] = await response.json();
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la lista de clientes');
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const handleFilterChange = useCallback((filters: FilterState) => {
    let filtered = [...customers];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(query) ||
        (customer.email ?? '').toLowerCase().includes(query) ||
        (customer.phone ?? '').includes(query)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(customer => customer.status === filters.status);
    }

    if (filters.spendingTier !== 'all') {
      filtered = filtered.filter(customer => {
        if (filters.spendingTier === 'high') return customer.lifetimeValue >= 10000;
        if (filters.spendingTier === 'medium') return customer.lifetimeValue >= 5000 && customer.lifetimeValue < 10000;
        if (filters.spendingTier === 'low') return customer.lifetimeValue < 5000;
        return true;
      });
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(customer => {
        const regDate = new Date(customer.registrationDate.split('/').reverse().join('-'));
        const fromDate = new Date(filters.dateFrom);
        return regDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(customer => {
        const regDate = new Date(customer.registrationDate.split('/').reverse().join('-'));
        const toDate = new Date(filters.dateTo);
        return regDate <= toDate;
      });
    }

    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [customers]);

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const currentPageIds = paginatedCustomers.map(c => c.id);
      setSelectedIds(currentPageIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action: string) => {
    if (action === 'delete') {
      setCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setFilteredCustomers(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    } else if (action === 'activate') {
      setCustomers(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, status: 'active' as const } : c
      ));
      setFilteredCustomers(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, status: 'active' as const } : c
      ));
    } else if (action === 'deactivate') {
      setCustomers(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, status: 'inactive' as const } : c
      ));
      setFilteredCustomers(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, status: 'inactive' as const } : c
      ));
    } else if (action === 'vip') {
      setCustomers(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, status: 'vip' as const } : c
      ));
      setFilteredCustomers(prev => prev.map(c => 
        selectedIds.includes(c.id) ? { ...c, status: 'vip' as const } : c
      ));
    }
  };

  const handleAddCustomer = () => {
    router.push('/customer-profile-creation');
  };

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-12 bg-muted rounded animate-pulse"></div>
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <div className="h-96 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Gestión de Clientes"
          actions={
            <>
              <div className="flex items-center gap-2 bg-card rounded-lg border border-border p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 rounded-md transition-smooth ${
                    viewMode === 'table' ?'bg-primary text-primary-foreground shadow-warm' :'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="Vista de tabla"
                >
                  <Icon name="TableCellsIcon" size={20} />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 rounded-md transition-smooth ${
                    viewMode === 'cards' ?'bg-primary text-primary-foreground shadow-warm' :'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="Vista de tarjetas"
                >
                  <Icon name="Squares2X2Icon" size={20} />
                </button>
              </div>
              <button
                onClick={handleAddCustomer}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Icon name="PlusIcon" size={20} />
                <span className="font-medium">Nuevo Cliente</span>
              </button>
            </>
          }
        />

        <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <p className="text-muted-foreground">Administra perfiles, historial y preferencias de clientes</p>

          <CustomerFilters
            onFilterChange={handleFilterChange}
            totalCount={customers.length}
            filteredCount={filteredCustomers.length}
          />

          {selectedIds.length > 0 && (
            <BulkActionsBar
              selectedCount={selectedIds.length}
              onAction={handleBulkAction}
              onClearSelection={() => setSelectedIds([])}
            />
          )}

          {loadError && (
            <div className="bg-error/10 border border-error text-error rounded-lg p-4">
              {loadError}
            </div>
          )}

          {!loadError && (
            <>
              {viewMode === 'table' ? (
                <CustomerTable
                  customers={paginatedCustomers}
                  selectedIds={selectedIds}
                  onSelectAll={handleSelectAll}
                  onSelectOne={handleSelectOne}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedCustomers.map(customer => (
                    <CustomerCard
                      key={customer.id}
                      customer={customer}
                      isSelected={selectedIds.includes(customer.id)}
                      onSelect={handleSelectOne}
                    />
                  ))}
                </div>
              )}

              {filteredCustomers.length === 0 && (
                <div className="bg-card rounded-lg border border-border p-12 text-center">
                  <Icon name="UserGroupIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                    No se encontraron clientes
                  </h3>
                  <p className="text-muted-foreground">
                    Intenta ajustar los filtros o agrega un nuevo cliente
                  </p>
                </div>
              )}
            </>
          )}

          {filteredCustomers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfileManagementInteractive;