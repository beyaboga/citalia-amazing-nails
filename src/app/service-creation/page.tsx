import { Suspense } from 'react';
import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import ServiceCreationInteractive from './components/ServiceCreationInteractive';

export const metadata: Metadata = {
  title: 'Crear Servicio - Citalia',
  description: 'Cree y configure nuevos servicios para el catálogo de Amazing Nails con precios, duración y categorización completa.',
};

export default function ServiceCreationPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />
      
      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Crear Servicio"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Servicios', href: '/services-catalog-management' },
            { label: 'Crear Servicio', href: '/service-creation' }
          ]}
        />

        <div className="p-6 md:p-8 lg:p-12 max-w-[1600px] mx-auto">
          <Suspense fallback={<div className="h-96 bg-card rounded-lg border border-border animate-pulse" />}>
            <ServiceCreationInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}