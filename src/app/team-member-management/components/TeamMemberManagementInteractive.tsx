'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import PageHeader from '@/components/common/PageHeader';
import TeamMemberTable, { TeamMember } from './TeamMemberTable';

interface RoleOption {
  id: number;
  slug: string;
  name: string;
}

const TeamMemberManagementInteractive = () => {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [membersRes, rolesRes] = await Promise.all([
          fetch('/api/team-members'),
          fetch('/api/roles'),
        ]);
        if (!membersRes.ok) throw new Error('No se pudo cargar la lista del equipo');
        const membersData: TeamMember[] = await membersRes.json();
        setMembers(membersData);
        if (rolesRes.ok) {
          setRoles(await rolesRes.json());
        }
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la lista del equipo');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return members.filter((member) => {
      const matchesQuery =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        (member.jobTitle ?? '').toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || member.roleSlug === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const handleAddMember = () => {
    router.push('/team-member-creation');
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:ml-[280px] min-h-screen">
          <div className="sticky top-0 z-30 bg-card border-b border-border h-20" />
          <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-96 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Gestión de Equipo"
          actions={
            <button
              onClick={handleAddMember}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Icon name="PlusIcon" size={20} />
              <span className="font-medium">Nuevo Miembro del Equipo</span>
            </button>
          }
        />

        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <p className="text-muted-foreground">
              Administra las cuentas de acceso, roles y disponibilidad del equipo
            </p>

            <div className="bg-card rounded-lg border border-border p-4 shadow-warm flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Icon
                  name="MagnifyingGlassIcon"
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, correo o puesto..."
                  className="w-full pl-10 pr-4 h-11 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-11 px-4 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
              >
                <option value="all">Todos los roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.slug}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {loadError && (
              <div className="bg-error/10 border border-error text-error rounded-lg p-4">{loadError}</div>
            )}

            {!loadError && filteredMembers.length === 0 && (
              <div className="bg-card rounded-lg border border-border p-12 text-center">
                <Icon name="UsersIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {members.length === 0 ? 'Aún no hay miembros del equipo' : 'No se encontraron resultados'}
                </h3>
                <p className="text-muted-foreground">
                  {members.length === 0
                    ? 'Agrega el primer miembro del equipo con el botón de arriba'
                    : 'Intenta ajustar la búsqueda o el filtro de rol'}
                </p>
              </div>
            )}

            {!loadError && filteredMembers.length > 0 && <TeamMemberTable members={filteredMembers} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberManagementInteractive;
