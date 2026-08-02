'use client';

import Icon from '@/components/ui/AppIcon';

interface CommunicationPreferencesData {
  preferredContact: string[];
  marketingConsent: boolean;
  appointmentReminders: boolean;
  promotionalEmails: boolean;
}

export interface CommunicationMethod {
  id: number;
  name: string;
  icon: string | null;
  customerCount?: number;
}

interface CommunicationPreferencesSectionProps {
  data: CommunicationPreferencesData;
  onChange: (data: CommunicationPreferencesData) => void;
  contactMethods: CommunicationMethod[];
  isLoadingContactMethods: boolean;
  onAddContactMethod: () => void;
  onEditContactMethod: (method: CommunicationMethod) => void;
}

const CommunicationPreferencesSection = ({
  data,
  onChange,
  contactMethods,
  isLoadingContactMethods,
  onAddContactMethod,
  onEditContactMethod,
}: CommunicationPreferencesSectionProps) => {
  const handleContactMethodToggle = (method: string) => {
    const newMethods = data.preferredContact.includes(method)
      ? data.preferredContact.filter(m => m !== method)
      : [...data.preferredContact, method];
    onChange({ ...data, preferredContact: newMethods });
  };

  const handleCheckboxChange = (field: keyof CommunicationPreferencesData) => {
    onChange({ ...data, [field]: !data[field as keyof typeof data] });
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="ChatBubbleLeftRightIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Preferencias de Comunicación</h2>
          <p className="caption text-muted-foreground text-sm">Métodos de contacto y consentimientos</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Métodos de Contacto Preferidos
          </label>
          {isLoadingContactMethods ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[60px] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contactMethods.map((method) => (
                <div key={method.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleContactMethodToggle(method.name)}
                    className={`w-full flex items-center gap-3 p-4 pr-10 rounded-lg border-2 transition-smooth ${
                      data.preferredContact.includes(method.name)
                        ? 'border-primary bg-primary/5' :'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      data.preferredContact.includes(method.name)
                        ? 'border-primary bg-primary' :'border-muted-foreground'
                    }`}>
                      {data.preferredContact.includes(method.name) && (
                        <Icon name="CheckIcon" size={14} className="text-primary-foreground" />
                      )}
                    </div>
                    <Icon name={(method.icon || 'ChatBubbleLeftRightIcon') as any} size={20} className="text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">{method.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditContactMethod(method);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-smooth"
                    aria-label={`Editar ${method.name}`}
                  >
                    <Icon name="PencilIcon" size={14} className="text-muted-foreground" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={onAddContactMethod}
                className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary text-primary hover:bg-primary/5 transition-smooth"
              >
                <Icon name="PlusIcon" size={18} />
                <span className="font-medium">Añadir método</span>
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-6">
          <label className="block text-sm font-medium text-foreground mb-4">
            Consentimientos y Notificaciones
          </label>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-smooth">
              <input
                type="checkbox"
                checked={data.appointmentReminders}
                onChange={() => handleCheckboxChange('appointmentReminders')}
                className="mt-1 w-5 h-5 rounded border-muted-foreground text-primary focus:ring-2 focus:ring-primary cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">Recordatorios de Citas</div>
                <p className="caption text-muted-foreground text-sm mt-1">
                  Recibir recordatorios automáticos antes de las citas programadas
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-smooth">
              <input
                type="checkbox"
                checked={data.marketingConsent}
                onChange={() => handleCheckboxChange('marketingConsent')}
                className="mt-1 w-5 h-5 rounded border-muted-foreground text-primary focus:ring-2 focus:ring-primary cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">Consentimiento de Marketing</div>
                <p className="caption text-muted-foreground text-sm mt-1">
                  Autorizo el uso de mis datos para campañas de marketing y promociones
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-smooth">
              <input
                type="checkbox"
                checked={data.promotionalEmails}
                onChange={() => handleCheckboxChange('promotionalEmails')}
                className="mt-1 w-5 h-5 rounded border-muted-foreground text-primary focus:ring-2 focus:ring-primary cursor-pointer"
              />
              <div className="flex-1">
                <div className="font-medium text-foreground">Correos Promocionales</div>
                <p className="caption text-muted-foreground text-sm mt-1">
                  Recibir ofertas especiales, descuentos y novedades por correo electrónico
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationPreferencesSection;