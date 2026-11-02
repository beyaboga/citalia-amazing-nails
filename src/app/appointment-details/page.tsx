import { Suspense } from 'react';
import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import AppointmentDetailsInteractive from './components/AppointmentDetailsInteractive';

export const metadata: Metadata = {
  title: 'Detalles de Cita - Citalia',
  description: 'Visualiza y gestiona información completa de citas individuales incluyendo datos del cliente, servicios seleccionados, historial de cambios y acciones disponibles para confirmar, completar, reprogramar o cancelar reservas.',
};

export default function AppointmentDetailsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader title="Detalles de Cita" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<div className="h-64 bg-card rounded-lg border border-border animate-pulse" />}>
            <AppointmentDetailsInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
