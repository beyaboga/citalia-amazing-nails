'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  searchQuery: string;
}

interface AppointmentFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

const AppointmentFilters = ({ onFilterChange, totalCount, filteredCount }: AppointmentFiltersProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    searchQuery: ''
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      onFilterChange(filters);
    }
  }, [filters, isHydrated, onFilterChange]);

  const handleInputChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      searchQuery: ''
    });
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.searchQuery;

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Icon name="FunnelIcon" size={20} className="text-primary" />
            <h2 className="font-heading font-semibold text-lg text-foreground">Filtros</h2>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                Activos
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={isExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
          >
            <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden md:block'}`}>
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre de cliente..."
              value={filters.searchQuery}
              onChange={(e) => handleInputChange('searchQuery', e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="dateFrom" className="block caption text-sm font-medium text-foreground mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                id="dateFrom"
                value={filters.dateFrom}
                onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              />
            </div>

            <div>
              <label htmlFor="dateTo" className="block caption text-sm font-medium text-foreground mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                id="dateTo"
                value={filters.dateTo}
                onChange={(e) => handleInputChange('dateTo', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              />
            </div>

            <div>
              <label htmlFor="status" className="block caption text-sm font-medium text-foreground mb-2">
                Estado
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth appearance-none cursor-pointer"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmada</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="inactive">Inactiva</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="caption text-sm text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{filteredCount}</span> de{' '}
              <span className="font-medium text-foreground">{totalCount}</span> citas
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 h-10 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Icon name="XMarkIcon" size={16} />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentFilters;