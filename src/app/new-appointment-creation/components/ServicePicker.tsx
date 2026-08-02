'use client';

import { useState, useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface ServiceOption {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  isActive: boolean;
}

interface ServicePickerProps {
  services: ServiceOption[];
  categories: string[];
  selectedIds: number[];
  /** Comisión por servicio, ya filtrada por permisos. Vacío = no mostrar. */
  commissions: Record<string, { amount: number; label: string }>;
  onToggle: (serviceId: number) => void;
}

const ServicePicker = ({
  services,
  categories,
  selectedIds,
  commissions,
  onToggle,
}: ServicePickerProps) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const showCommission = Object.keys(commissions).length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services
      .filter((service) => service.isActive)
      .filter((service) => activeCategory === 'all' || service.category === activeCategory)
      .filter(
        (service) =>
          !q ||
          service.name.toLowerCase().includes(q) ||
          service.category.toLowerCase().includes(q)
      );
  }, [services, activeCategory, query]);

  return (
    <section className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="SparklesIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Servicios</h2>
          <p className="caption text-muted-foreground text-sm">
            Busca y selecciona uno o varios servicios
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Icon
          name="MagnifyingGlassIcon"
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar servicio por nombre o categoría..."
          className="w-full pl-10 pr-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
        />
      </div>

      {/* Filtros de categoría */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-smooth ${
            activeCategory === 'all'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-foreground hover:border-primary/50'
          }`}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-smooth ${
              activeCategory === category
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-primary/50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tarjetas de servicio */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <Icon name="MagnifyingGlassIcon" size={36} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No se encontraron servicios</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((service) => {
            const isSelected = selectedIds.includes(Number(service.id));
            const commission = commissions[service.id];
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onToggle(Number(service.id))}
                aria-pressed={isSelected}
                className={`text-left p-3 rounded-lg border transition-smooth focus:outline-none focus:ring-2 focus:ring-primary ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-warm'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm leading-snug">{service.name}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">
                      {service.category}
                    </span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-smooth ${
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                    }`}
                  >
                    {isSelected && <Icon name="CheckIcon" size={14} />}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 caption text-xs text-muted-foreground tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="ClockIcon" size={13} />
                    {service.duration} min
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    L {service.price.toLocaleString()}
                  </span>
                  {showCommission && commission && (
                    <span
                      className="inline-flex items-center gap-1 text-success"
                      title="Comisión del técnico por este servicio"
                    >
                      <Icon name="BanknotesIcon" size={13} />
                      {commission.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ServicePicker;
