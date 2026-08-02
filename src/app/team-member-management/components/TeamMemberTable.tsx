'use client';

import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export interface TeamMember {
  userId: number;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  role: string;
  roleSlug: string;
  teamMemberId: number | null;
  jobTitle: string | null;
  employeeCode: string | null;
  colorHex: string | null;
  hireDate: string | null;
  isBookable: boolean;
  terminationDate: string | null;
  hasAccess: boolean;
}

interface TeamMemberTableProps {
  members: TeamMember[];
}

const ROLE_BADGE_CLASSES: Record<string, string> = {
  admin: 'bg-accent/20 text-accent-foreground border-accent/30',
  receptionist: 'bg-primary/10 text-primary border-primary/20',
  technician: 'bg-success/10 text-success border-success/20',
};

const TeamMemberTable = ({ members }: TeamMemberTableProps) => {
  const router = useRouter();

  const handleEdit = (userId: number) => {
    router.push(`/team-member-creation?id=${userId}`);
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-warm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Miembro</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Contacto</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Rol</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Reservable</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Vigencia</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Estado</span>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="caption font-semibold text-foreground">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.userId} className="hover:bg-muted/30 transition-smooth">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {member.isBookable && member.colorHex ? (
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `${member.colorHex}22` }}
                      >
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: member.colorHex }} aria-hidden="true" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon name="UserIcon" size={18} className="text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="caption text-muted-foreground text-xs">
                        {member.jobTitle || 'Sin puesto asignado'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <p className="caption text-foreground">{member.email}</p>
                    <p className="caption text-muted-foreground text-xs">{member.phone || '—'}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full caption font-medium border ${
                      ROLE_BADGE_CLASSES[member.roleSlug] ?? 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {member.isBookable ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full caption font-medium bg-success/10 text-success border border-success/20">
                      <Icon name="CheckCircleIcon" size={14} />
                      Sí
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full caption font-medium bg-muted text-muted-foreground border border-border">
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {member.terminationDate ? (
                    <div className="space-y-0.5">
                      <p className={`caption ${member.hasAccess ? 'text-foreground' : 'text-error'}`}>
                        Hasta {member.terminationDate}
                      </p>
                      {!member.hasAccess && (
                        <p className="caption text-error text-xs">Acceso vencido</p>
                      )}
                    </div>
                  ) : (
                    <span className="caption text-muted-foreground">Sin vencimiento</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {member.hasAccess ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full caption font-medium bg-success/10 text-success border border-success/20">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full caption font-medium bg-muted text-muted-foreground border border-border">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(member.userId)}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label={`Editar ${member.name}`}
                    title="Editar"
                  >
                    <Icon name="PencilSquareIcon" size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamMemberTable;
