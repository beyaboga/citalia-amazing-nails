import { Suspense } from 'react';
import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ReserveFundsReportInteractive from './components/ReserveFundsReportInteractive';

export const metadata: Metadata = {
  title: 'Reporte de Fondos - Citalia',
  description:
    'Reporte de movimientos de Fondos Reservados por fondo, mes, año, empleado o servicio.',
};

export default function ReserveFundsReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Reporte de Fondos"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Reporte de Fondos', href: '/reserve-funds-report' },
          ]}
        />

        <div className="p-6">
          <Suspense
            fallback={
              <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
            }
          >
            <ReserveFundsReportInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
