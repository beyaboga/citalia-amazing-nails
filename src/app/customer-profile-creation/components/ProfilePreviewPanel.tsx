'use client';

import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';
import type { CustomerProfileData } from './CustomerProfileCreationInteractive';
import type { AvailableService } from './ServicePreferencesSection';

interface ProfilePreviewPanelProps {
  profileData: CustomerProfileData;
  services: AvailableService[];
}

const ProfilePreviewPanel = ({ profileData, services }: ProfilePreviewPanelProps) => {
  const { personalInfo, communicationPreferences, servicePreferences, additionalInfo } = profileData;
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));
  
  const fullName = personalInfo.name.trim() || 'Nuevo Cliente';
  const hasBasicInfo = personalInfo.name.trim() && personalInfo.phone && personalInfo.email;

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      <div className="bg-primary/5 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon name="EyeIcon" size={20} className="text-primary" />
          <h3 className="font-heading text-lg font-semibold text-foreground">Vista Previa del Perfil</h3>
        </div>
        <p className="caption text-muted-foreground text-sm mt-1">
          Así se verá el perfil en el sistema
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          {personalInfo.photo ? (
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mb-3">
              <AppImage
                src={personalInfo.photo}
                alt={`Foto de ${fullName}`}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-3">
              <Icon name="UserIcon" size={32} className="text-muted-foreground" />
            </div>
          )}
          
          <h4 className="font-heading text-lg font-semibold text-foreground">
            {fullName}
          </h4>
          
          {!hasBasicInfo && (
            <p className="caption text-muted-foreground text-sm mt-1">
              Completa la información básica
            </p>
          )}
        </div>

        {hasBasicInfo && (
          <>
            <div className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center gap-3 text-sm">
                <Icon name="PhoneIcon" size={16} className="text-muted-foreground" />
                <span className="text-foreground">{personalInfo.phone || 'Sin teléfono'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Icon name="EnvelopeIcon" size={16} className="text-muted-foreground" />
                <span className="text-foreground truncate">{personalInfo.email || 'Sin correo'}</span>
              </div>
              {personalInfo.birthDate && (
                <div className="flex items-center gap-3 text-sm">
                  <Icon name="CakeIcon" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">
                    {new Date(personalInfo.birthDate).toLocaleDateString('es-HN', { 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </div>
              )}
            </div>

            {communicationPreferences.preferredContact.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-primary" />
                  Contacto Preferido
                </h5>
                <div className="flex flex-wrap gap-2">
                  {communicationPreferences.preferredContact.map((method) => (
                    <span
                      key={method}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md font-medium"
                    >
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {servicePreferences.favoriteServices.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Icon name="SparklesIcon" size={16} className="text-primary" />
                  Servicios de Interés
                </h5>
                <div className="flex flex-wrap gap-2">
                  {servicePreferences.favoriteServices.slice(0, 3).map((serviceId) => (
                    <span
                      key={serviceId}
                      className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-md font-medium"
                    >
                      {serviceNameById.get(serviceId) || serviceId}
                    </span>
                  ))}
                  {servicePreferences.favoriteServices.length > 3 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md font-medium">
                      +{servicePreferences.favoriteServices.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            )}

            {servicePreferences.preferredTimeSlots.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Icon name="ClockIcon" size={16} className="text-primary" />
                  Horarios Preferidos
                </h5>
                <div className="space-y-1">
                  {servicePreferences.preferredTimeSlots.map((slot) => (
                    <div key={slot} className="text-sm text-muted-foreground">
                      {slot === 'morning' && '🌅 Mañana'}
                      {slot === 'afternoon' && '☀️ Tarde'}
                      {slot === 'evening' && '🌙 Noche'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(additionalInfo.allergies || additionalInfo.specialRequirements) && (
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Icon name="ExclamationTriangleIcon" size={16} className="text-accent mt-0.5" />
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-foreground mb-1">Notas Importantes</h5>
                    {additionalInfo.allergies && (
                      <p className="caption text-muted-foreground text-xs mb-1">
                        <strong>Alergias:</strong> {additionalInfo.allergies}
                      </p>
                    )}
                    {additionalInfo.specialRequirements && (
                      <p className="caption text-muted-foreground text-xs">
                        <strong>Requisitos:</strong> {additionalInfo.specialRequirements}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex gap-2">
                {communicationPreferences.appointmentReminders && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" title="Recordatorios activos">
                    <Icon name="BellIcon" size={16} className="text-primary" />
                  </div>
                )}
                {communicationPreferences.marketingConsent && (
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center" title="Marketing autorizado">
                    <Icon name="MegaphoneIcon" size={16} className="text-accent" />
                  </div>
                )}
              </div>
              <span className="caption text-muted-foreground text-xs">
                Perfil completo al {Math.round((Object.values(profileData).filter(section => 
                  typeof section === 'object' && Object.values(section).some(v => 
                    Array.isArray(v) ? v.length > 0 : v !== '' && v !== false
                  )
                ).length / 4) * 100)}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePreviewPanel;