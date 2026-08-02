'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface ServiceSelectionProps {
  onServicesChange: (services: Service[]) => void;
  selectedServices?: Service[];
}

const ServiceSelection = ({ onServicesChange, selectedServices = [] }: ServiceSelectionProps) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Service[]>(selectedServices);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      const mockServices: Service[] = [
        { id: '1', name: 'Manicure Clásico', category: 'manicure', duration: 45, price: 150 },
        { id: '2', name: 'Manicure Spa', category: 'manicure', duration: 60, price: 250 },
        { id: '3', name: 'Pedicure Clásico', category: 'pedicure', duration: 60, price: 200 },
        { id: '4', name: 'Pedicure Spa', category: 'pedicure', duration: 75, price: 300 },
        { id: '5', name: 'Reforzamiento con Gel', category: 'reinforcement', duration: 90, price: 350 },
        { id: '6', name: 'Reforzamiento con Acrílico', category: 'reinforcement', duration: 90, price: 400 },
        { id: '7', name: 'Semipermanente Manos', category: 'semi-permanent', duration: 60, price: 280 },
        { id: '8', name: 'Semipermanente Pies', category: 'semi-permanent', duration: 60, price: 280 },
        { id: '9', name: 'Polygel Completo', category: 'polygel', duration: 120, price: 500 },
        { id: '10', name: 'Polygel Relleno', category: 'polygel', duration: 90, price: 350 }
      ];
      setServices(mockServices);
    }
  }, [isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      onServicesChange(selected);
    }
  }, [selected, isHydrated, onServicesChange]);

  const categories = [
    { id: 'all', label: 'Todos los Servicios', icon: 'SparklesIcon' },
    { id: 'manicure', label: 'Manicure', icon: 'HandRaisedIcon' },
    { id: 'pedicure', label: 'Pedicure', icon: 'HandRaisedIcon' },
    { id: 'reinforcement', label: 'Reforzamiento', icon: 'ShieldCheckIcon' },
    { id: 'semi-permanent', label: 'Semipermanente', icon: 'PaintBrushIcon' },
    { id: 'polygel', label: 'Polygel', icon: 'BeakerIcon' }
  ];

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleServiceToggle = (service: Service) => {
    setSelected(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const isSelected = (serviceId: string) => {
    return selected.some(s => s.id === serviceId);
  };

  if (!isHydrated) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="SparklesIcon" size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">Selección de Servicios</h2>
            <p className="caption text-muted-foreground text-sm">Elige los servicios para la cita</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="SparklesIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Selección de Servicios</h2>
          <p className="caption text-muted-foreground text-sm">Elige los servicios para la cita</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar servicios..."
            className="w-full pl-10 pr-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center gap-2 px-4 h-10 rounded-lg font-medium text-sm transition-smooth ${
              selectedCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-warm'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            <Icon name={category.icon as any} size={16} />
            {category.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="MagnifyingGlassIcon" size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No se encontraron servicios</p>
          </div>
        ) : (
          filteredServices.map(service => (
            <button
              key={service.id}
              onClick={() => handleServiceToggle(service)}
              className={`w-full p-4 rounded-lg border transition-smooth text-left ${
                isSelected(service.id)
                  ? 'border-primary bg-primary/5' :'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{service.name}</h3>
                    {isSelected(service.id) && (
                      <Icon name="CheckCircleIcon" size={20} className="text-primary" variant="solid" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon name="ClockIcon" size={16} />
                      {service.duration} min
                    </span>
                    <span className="data-text font-medium text-foreground">
                      L {service.price.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-sm font-medium text-foreground mb-2">
            {selected.length} servicio{selected.length !== 1 ? 's' : ''} seleccionado{selected.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map(service => (
              <span
                key={service.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm"
              >
                {service.name}
                <button
                  onClick={() => handleServiceToggle(service)}
                  className="hover:bg-accent/30 rounded-full p-0.5 transition-smooth"
                  aria-label={`Eliminar ${service.name}`}
                >
                  <Icon name="XMarkIcon" size={14} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelection;