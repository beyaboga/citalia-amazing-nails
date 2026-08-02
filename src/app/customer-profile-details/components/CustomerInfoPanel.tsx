import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import CustomerStatusBadge from '../../customer-profile-management/components/CustomerStatusBadge';

interface CustomerDetails {
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
  birthday?: string;
  address?: string;
  preferredContactMethods: string[];
  loyaltyPoints: number;
}

interface CustomerInfoPanelProps {
  customer: CustomerDetails;
}

const CustomerInfoPanel = ({ customer }: CustomerInfoPanelProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 bg-muted">
          <AppImage
            src={customer.image}
            alt={customer.imageAlt}
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-2 text-center">
          {customer.name}
        </h2>
        <CustomerStatusBadge status={customer.status} />
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Icon name="EnvelopeIcon" size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="caption text-muted-foreground text-xs mb-1">Email</p>
            <a href={`mailto:${customer.email}`} className="text-foreground hover:text-primary transition-smooth break-all">
              {customer.email}
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Icon name="PhoneIcon" size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="caption text-muted-foreground text-xs mb-1">Teléfono</p>
            <a href={`tel:${customer.phone}`} className="text-foreground hover:text-primary transition-smooth">
              {customer.phone}
            </a>
          </div>
        </div>

        {customer.address && (
          <div className="flex items-start gap-3">
            <Icon name="MapPinIcon" size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="caption text-muted-foreground text-xs mb-1">Dirección</p>
              <p className="text-foreground">{customer.address}</p>
            </div>
          </div>
        )}

        {customer.birthday && (
          <div className="flex items-start gap-3">
            <Icon name="CakeIcon" size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="caption text-muted-foreground text-xs mb-1">Cumpleaños</p>
              <p className="text-foreground">{customer.birthday}</p>
            </div>
          </div>
        )}

        {customer.preferredContactMethods.length > 0 && (
          <div className="flex items-start gap-3">
            <Icon name="ChatBubbleLeftRightIcon" size={18} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="caption text-muted-foreground text-xs mb-1">Comunicación Preferida</p>
              <p className="text-foreground">{customer.preferredContactMethods.join(', ')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="caption text-muted-foreground text-xs mb-1">Citas Totales</p>
            <p className="font-data text-2xl font-semibold text-foreground">{customer.totalAppointments}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="caption text-muted-foreground text-xs mb-1">Valor Total</p>
            <p className="font-data text-2xl font-semibold text-primary">L {customer.lifetimeValue.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 bg-accent/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="caption text-muted-foreground text-xs mb-1">Puntos de Lealtad</p>
              <p className="font-data text-xl font-semibold text-accent-foreground">{customer.loyaltyPoints}</p>
            </div>
            <Icon name="StarIcon" size={24} className="text-accent" />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="caption text-muted-foreground">Cliente desde</span>
          <span className="caption font-medium text-foreground">{customer.registrationDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="caption text-muted-foreground">Última visita</span>
          <span className="caption font-medium text-foreground">{customer.lastVisit}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerInfoPanel;