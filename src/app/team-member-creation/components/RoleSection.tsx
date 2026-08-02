'use client';

import Icon from '@/components/ui/AppIcon';

export interface AvailableRole {
  id: number;
  slug: string;
  name: string;
  description: string | null;
}

interface RoleSectionProps {
  roleId: number | null;
  onChange: (roleId: number) => void;
  roles: AvailableRole[];
  isLoading: boolean;
}

const ROLE_ICONS: Record<string, string> = {
  admin: 'ShieldCheckIcon',
  receptionist: 'PhoneIcon',
  technician: 'SparklesIcon',
};

const RoleSection = ({ roleId, onChange, roles, isLoading }: RoleSectionProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="KeyIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Rol del Sistema</h2>
          <p className="caption text-muted-foreground text-sm">Determina qué puede hacer en el panel de administración</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role.id)}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                roleId === role.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              }`}
              aria-pressed={roleId === role.id}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  roleId === role.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon name={ROLE_ICONS[role.slug] ?? 'UserIcon'} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{role.name}</p>
                {role.description && (
                  <p className="caption text-muted-foreground text-sm mt-0.5">{role.description}</p>
                )}
              </div>
              {roleId === role.id && (
                <Icon name="CheckCircleIcon" size={20} className="text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoleSection;
