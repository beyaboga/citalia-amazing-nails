import { Suspense } from 'react';
import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ReserveFundsInteractive from './components/ReserveFundsInteractive';

export const metadata: Metadata = {
  title: 'Fondos Reservados - Citalia',
  description:
    'Bolsillos virtuales: reserva automática de costos, comisiones y fondos personalizados por período mensual.',
};

export default function ReserveFundsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Fondos Reservados"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Fondos Reservados', href: '/reserve-funds' },
          ]}
        />

        <div className="p-6">
          <Suspense
            fallback={
              <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
            }
          >
            <ReserveFundsInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
