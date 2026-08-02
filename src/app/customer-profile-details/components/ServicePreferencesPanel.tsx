import Icon from '@/components/ui/AppIcon';

interface ServicePreferencesPanelProps {
  preferences: string[];
  allergies?: string;
  specialRequirements?: string;
}

const ServicePreferencesPanel = ({ preferences, allergies, specialRequirements }: ServicePreferencesPanelProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <Icon name="SparklesIcon" size={24} className="text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Preferencias de Servicio
        </h2>
      </div>

      <div className="space-y-6">
        <div>
          <p className="caption text-muted-foreground text-xs mb-3">Servicios Favoritos</p>
          <div className="space-y-2">
            {preferences.map((preference, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10"
              >
                <Icon name="HeartIcon" size={16} className="text-primary flex-shrink-0" variant="solid" />
                <span className="caption font-medium text-foreground">{preference}</span>
              </div>
            ))}
          </div>
        </div>

        {allergies && (
          <div className="pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Icon name="ExclamationTriangleIcon" size={18} className="text-warning" />
              <p className="caption text-muted-foreground text-xs font-semibold">Alergias</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20">
              <Icon name="ShieldExclamationIcon" size={16} className="text-warning flex-shrink-0" />
              <span className="caption font-medium text-foreground">{allergies}</span>
            </div>
          </div>
        )}

        {specialRequirements && (
          <div className="pt-6 border-t border-border">
            <p className="caption text-muted-foreground text-xs mb-3">Requerimientos Especiales</p>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="caption text-foreground">{specialRequirements}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicePreferencesPanel;