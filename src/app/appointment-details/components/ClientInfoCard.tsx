import Icon from '@/components/ui/AppIcon';

interface ClientInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface ClientInfoCardProps {
  client: ClientInfo;
}

const ClientInfoCard = ({ client }: ClientInfoCardProps) => {
  const initial = client.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">
        Información del Cliente
      </h2>

      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full flex-shrink-0 bg-primary/10 text-primary flex items-center justify-center font-heading text-2xl font-semibold">
          {initial}
        </div>

        <div className="flex-1 space-y-3">
          <h3 className="font-medium text-foreground text-base">{client.name}</h3>

          <div className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2 text-foreground caption">
                <Icon name="EnvelopeIcon" size={16} className="text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:text-primary transition-smooth">
                  {client.email}
                </a>
              </div>
            )}

            {client.phone && (
              <div className="flex items-center gap-2 text-foreground caption">
                <Icon name="PhoneIcon" size={16} className="text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:text-primary transition-smooth">
                  {client.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoCard;
