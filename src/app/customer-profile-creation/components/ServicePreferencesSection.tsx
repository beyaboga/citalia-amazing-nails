'use client';

import Icon from '@/components/ui/AppIcon';

interface ServicePreferencesData {
  favoriteServices: string[];
  preferredTechnician: string;
  preferredTimeSlots: string[];
  colorPreferences: string;
}

export interface AvailableService {
  id: string;
  name: string;
  isActive: boolean;
}

export interface AvailableTechnician {
  userId: number;
  name: string;
  jobTitle: string | null;
}

interface ServicePreferencesSectionProps {
  data: ServicePreferencesData;
  onChange: (data: ServicePreferencesData) => void;
  services: AvailableService[];
  isLoadingServices: boolean;
  technicians: AvailableTechnician[];
  isLoadingTechnicians: boolean;
}

const ServicePreferencesSection = ({
  data,
  onChange,
  services,
  isLoadingServices,
  technicians,
  isLoadingTechnicians
}: ServicePreferencesSectionProps) => {
  const availableServices = services.filter((service) => service.isActive);

  const timeSlots = [
    { value: 'morning', label: 'Mañana (8:00 AM - 12:00 PM)', icon: 'SunIcon' },
    { value: 'afternoon', label: 'Tarde (12:00 PM - 5:00 PM)', icon: 'ClockIcon' },
    { value: 'evening', label: 'Noche (5:00 PM - 8:00 PM)', icon: 'MoonIcon' }
  ];

  const handleServiceToggle = (serviceId: string) => {
    const newServices = data.favoriteServices.includes(serviceId)
      ? data.favoriteServices.filter(s => s !== serviceId)
      : [...data.favoriteServices, serviceId];
    onChange({ ...data, favoriteServices: newServices });
  };

  const handleTimeSlotToggle = (slot: string) => {
    const newSlots = data.preferredTimeSlots.includes(slot)
      ? data.preferredTimeSlots.filter(s => s !== slot)
      : [...data.preferredTimeSlots, slot];
    onChange({ ...data, preferredTimeSlots: newSlots });
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="SparklesIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Preferencias de Servicio</h2>
          <p className="caption text-muted-foreground text-sm">Servicios favoritos y horarios preferidos</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Servicios de Interés
          </label>
          {isLoadingServices ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-9 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : availableServices.length === 0 ? (
            <p className="caption text-muted-foreground text-sm">No hay servicios disponibles todavía</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleServiceToggle(service.id)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-smooth ${
                    data.favoriteServices.includes(service.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  {service.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="preferredTechnician" className="block text-sm font-medium text-foreground mb-2">
            Técnico Preferido
          </label>
          <div className="relative">
            <select
              id="preferredTechnician"
              value={data.preferredTechnician}
              onChange={(e) => onChange({ ...data, preferredTechnician: e.target.value })}
              disabled={isLoadingTechnicians}
              className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {isLoadingTechnicians ? 'Cargando técnicos...' : 'Sin preferencia'}
              </option>
              {technicians.map((tech) => (
                <option key={tech.userId} value={String(tech.userId)}>
                  {tech.jobTitle ? `${tech.name} — ${tech.jobTitle}` : tech.name}
                </option>
              ))}
            </select>
            <Icon
              name="ChevronDownIcon"
              size={20}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
          </div>
          {!isLoadingTechnicians && technicians.length === 0 && (
            <p className="caption text-muted-foreground text-xs mt-1">
              Aún no hay personal reservable registrado en el equipo
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Horarios Preferidos
          </label>
          <div className="space-y-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => handleTimeSlotToggle(slot.value)}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-smooth ${
                  data.preferredTimeSlots.includes(slot.value)
                    ? 'border-primary bg-primary/5' :'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  data.preferredTimeSlots.includes(slot.value)
                    ? 'border-primary bg-primary' :'border-muted-foreground'
                }`}>
                  {data.preferredTimeSlots.includes(slot.value) && (
                    <Icon name="CheckIcon" size={14} className="text-primary-foreground" />
                  )}
                </div>
                <Icon name={slot.icon as any} size={20} className="text-muted-foreground" />
                <span className="font-medium text-foreground">{slot.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="colorPreferences" className="block text-sm font-medium text-foreground mb-2">
            Preferencias de Color
          </label>
          <textarea
            id="colorPreferences"
            value={data.colorPreferences}
            onChange={(e) => onChange({ ...data, colorPreferences: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
            placeholder="Ej: Prefiere tonos neutros y pasteles, evita colores oscuros"
          />
        </div>
      </div>
    </div>
  );
};

export default ServicePreferencesSection;