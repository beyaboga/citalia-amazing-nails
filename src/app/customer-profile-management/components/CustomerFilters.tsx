'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  status: string;
  searchQuery: string;
  spendingTier: string;
}

interface CustomerFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

const CustomerFilters = ({ onFilterChange, totalCount, filteredCount }: CustomerFiltersProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    searchQuery: '',
    spendingTier: 'all'
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
      searchQuery: '',
      spendingTier: 'all'
    });
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status !== 'all' || filters.searchQuery || filters.spendingTier !== 'all';

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-10 bg-muted rounded"></div>
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
          <div className="flex items-center gap-3">
            <span className="caption text-muted-foreground">
              {filteredCount} de {totalCount} clientes
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={isExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
            >
              <Icon name={isExpanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden md:block'}`}>
          <div className="relative">
            <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={filters.searchQuery}
              onChange={(e) => handleInputChange('searchQuery', e.target.value)}
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block caption text-muted-foreground mb-2">
                Estado
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div>
              <label className="block caption text-muted-foreground mb-2">
                Nivel de Gasto
              </label>
              <select
                value={filters.spendingTier}
                onChange={(e) => handleInputChange('spendingTier', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              >
                <option value="all">Todos los niveles</option>
                <option value="high">Alto (≥ L 10,000)</option>
                <option value="medium">Medio (L 5,000 - L 9,999)</option>
                <option value="low">Bajo (&lt; L 5,000)</option>
              </select>
            </div>

            <div>
              <label className="block caption text-muted-foreground mb-2">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              />
            </div>

            <div>
              <label className="block caption text-muted-foreground mb-2">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleInputChange('dateTo', e.target.value)}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Icon name="XMarkIcon" size={16} />
                <span className="caption font-medium">Limpiar filtros</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;