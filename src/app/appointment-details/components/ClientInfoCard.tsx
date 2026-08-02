import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  image: string;
  alt: string;
  totalAppointments: number;
  lastVisit: string;
}

interface ClientInfoCardProps {
  client: ClientInfo;
}

const ClientInfoCard = ({ client }: ClientInfoCardProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
        Información del Cliente
      </h2>
      
      <div className="flex items-start gap-4">
        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0 bg-muted">
          <AppImage
            src={client.image}
            alt={client.alt}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-medium text-foreground text-base mb-1">
              {client.name}
            </h3>
            <div className="flex items-center gap-2 text-muted-foreground caption">
              <Icon name="UserIcon" size={14} />
              <span>{client.totalAppointments} citas realizadas</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground caption">
              <Icon name="EnvelopeIcon" size={16} className="text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="hover:text-primary transition-smooth">
                {client.email}
              </a>
            </div>
            
            <div className="flex items-center gap-2 text-foreground caption">
              <Icon name="PhoneIcon" size={16} className="text-muted-foreground" />
              <a href={`tel:${client.phone}`} className="hover:text-primary transition-smooth">
                {client.phone}
              </a>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground caption">
              <Icon name="ClockIcon" size={16} />
              <span>Última visita: {client.lastVisit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoCard;