import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import Icon from '@/components/ui/AppIcon';
import AppointmentFormInteractive from './components/AppointmentFormInteractive';

export const metadata: Metadata = {
  title: 'Nueva Cita - Citalia',
  description:
    'Crea una nueva cita: busca el cliente, selecciona servicios por categoría, asigna profesional y verifica disponibilidad.',
};

export default function NewAppointmentCreationPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <div className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Nueva Cita"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Agenda', href: '/appointments-calendar' },
            { label: 'Nueva Cita', href: '/new-appointment-creation' },
          ]}
          leading={
            <Link
              href="/appointments-calendar"
              className="p-2 rounded-lg hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Volver a la agenda"
            >
              <Icon name="ArrowLeftIcon" size={20} className="text-foreground" />
            </Link>
          }
        />

        <main className="max-w-[1400px] mx-auto px-6 py-8">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-40 bg-card rounded-lg border border-border animate-pulse" />
                  <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
                </div>
                <div className="h-80 bg-card rounded-lg border border-border animate-pulse" />
              </div>
            }
          >
            <AppointmentFormInteractive />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
