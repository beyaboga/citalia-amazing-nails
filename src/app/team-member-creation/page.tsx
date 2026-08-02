import type { Metadata } from 'next';
import { Suspense } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import TeamMemberCreationInteractive from './components/TeamMemberCreationInteractive';

export const metadata: Metadata = {
  title: 'Crear Miembro del Equipo - Citalia',
  description: 'Registra un nuevo miembro del equipo con su rol de acceso, información profesional y horario de disponibilidad.',
};

interface TeamMemberCreationPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function TeamMemberCreationPage({ searchParams }: TeamMemberCreationPageProps) {
  const { id } = await searchParams;
  const isEditMode = Boolean(id);
  const title = isEditMode ? 'Editar Miembro del Equipo' : 'Crear Miembro del Equipo';

  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title={title}
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Equipo', href: '/team-member-management' },
            { label: title, href: '/team-member-creation' },
          ]}
        />

        <div className="p-6 md:p-8 lg:p-12 max-w-[1600px] mx-auto">
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mb-6">
            {isEditMode
              ? 'Actualiza la cuenta de acceso, el rol, la vigencia y el horario del miembro del equipo.'
              : 'Registra la cuenta de acceso, el rol y, si aplica, el horario de un nuevo miembro del equipo.'}
          </p>

          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
                <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
              </div>
            }
          >
            <TeamMemberCreationInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
