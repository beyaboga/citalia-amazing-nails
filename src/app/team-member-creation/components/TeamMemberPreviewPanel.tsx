'use client';

import Icon from '@/components/ui/AppIcon';
import type { AvailableRole } from './RoleSection';
import type { TeamMemberData } from './TeamMemberCreationInteractive';

interface TeamMemberPreviewPanelProps {
  memberData: TeamMemberData;
  roles: AvailableRole[];
}

const TeamMemberPreviewPanel = ({ memberData, roles }: TeamMemberPreviewPanelProps) => {
  const { personalInfo, roleId, professionalInfo, schedule } = memberData;
  const role = roles.find((r) => r.id === roleId) ?? null;
  const hasBasicInfo = personalInfo.name && personalInfo.email;
  const activeDays = schedule.filter((day) => day.enabled);

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      <div className="bg-primary/5 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon name="EyeIcon" size={20} className="text-primary" />
          <h3 className="font-heading text-lg font-semibold text-foreground">Vista Previa</h3>
        </div>
        <p className="caption text-muted-foreground text-sm mt-1">Así se verá el miembro en el sistema</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: professionalInfo.isBookable ? `${professionalInfo.colorHex || '#B84A78'}22` : undefined }}
          >
            {professionalInfo.isBookable && professionalInfo.colorHex ? (
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: professionalInfo.colorHex }}
                aria-hidden="true"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Icon name="UserIcon" size={32} className="text-muted-foreground" />
              </div>
            )}
          </div>

          <h4 className="font-heading text-lg font-semibold text-foreground">
            {personalInfo.name || 'Nuevo Miembro'}
          </h4>

          {role && (
            <span className="mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md font-medium">
              {role.name}
            </span>
          )}

          {!hasBasicInfo && (
            <p className="caption text-muted-foreground text-sm mt-1">Completa la información básica</p>
          )}
        </div>

        {hasBasicInfo && (
          <>
            <div className="space-y-3 pb-4 border-b border-border">
              <div className="flex items-center gap-3 text-sm">
                <Icon name="EnvelopeIcon" size={16} className="text-muted-foreground" />
                <span className="text-foreground truncate">{personalInfo.email}</span>
              </div>
              {personalInfo.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Icon name="PhoneIcon" size={16} className="text-muted-foreground" />
                  <span className="text-foreground">{personalInfo.phone}</span>
                </div>
              )}
            </div>

            {professionalInfo.isBookable ? (
              <>
                <div>
                  <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Icon name="BriefcaseIcon" size={16} className="text-primary" />
                    {professionalInfo.jobTitle || 'Puesto sin definir'}
                  </h5>
                  {professionalInfo.employeeCode && (
                    <p className="caption text-muted-foreground text-xs">Código: {professionalInfo.employeeCode}</p>
                  )}
                </div>

                <div>
                  <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Icon name="ClockIcon" size={16} className="text-primary" />
                    Disponibilidad
                  </h5>
                  {activeDays.length > 0 ? (
                    <div className="space-y-1">
                      {activeDays.map((day) => (
                        <div key={day.dayOfWeek} className="text-sm text-muted-foreground flex justify-between">
                          <span>{day.dayLabel}</span>
                          <span className="data-text">
                            {day.slots.map((s) => `${s.start}-${s.end}`).join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="caption text-muted-foreground text-sm">Sin días activos todavía</p>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <Icon name="InformationCircleIcon" size={16} className="text-muted-foreground mt-0.5" />
                <p className="caption text-muted-foreground text-sm">
                  No es personal reservable — no aparecerá en el calendario de citas
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeamMemberPreviewPanel;
