import Icon from '@/components/ui/AppIcon';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
}

interface ServicesCardProps {
  services: Service[];
  totalAmount: number;
  notes?: string;
}

const ServicesCard = ({ services, totalAmount, notes }: ServicesCardProps) => {
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Manicura': 'HandRaisedIcon',
      'Pedicura': 'SparklesIcon',
      'Reforzamiento': 'ShieldCheckIcon',
      'Semipermanente': 'PaintBrushIcon',
      'Polygel': 'BeakerIcon'
    };
    return icons[category] || 'SparklesIcon';
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
        Servicios Seleccionados
      </h2>
      
      <div className="space-y-3 mb-4">
        {services.map((service) => (
          <div key={service.id} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name={getCategoryIcon(service.category) as any} size={20} className="text-primary" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-foreground text-sm mb-1">
                  {service.name}
                </h3>
                <div className="flex items-center gap-3 caption text-muted-foreground">
                  <span>{service.category}</span>
                  <span>•</span>
                  <span>{service.duration} min</span>
                </div>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <p className="font-semibold text-foreground data-text">
                L {service.price.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {notes && (
        <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <div className="flex items-start gap-2">
            <Icon name="InformationCircleIcon" size={18} className="text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="caption font-medium text-accent-foreground mb-1">Notas Especiales</p>
              <p className="caption text-accent-foreground/80">{notes}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-heading text-2xl font-semibold text-primary data-text">
            L {totalAmount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="caption text-muted-foreground mt-1 text-right">
          Duración total: {services.reduce((acc, s) => acc + s.duration, 0)} minutos
        </p>
      </div>
    </div>
  );
};

export default ServicesCard;