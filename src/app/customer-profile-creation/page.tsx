import type { Metadata } from 'next';
import { Suspense } from 'react';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import CustomerProfileCreationInteractive from './components/CustomerProfileCreationInteractive';

export const metadata: Metadata = {
  title: 'Crear Perfil de Cliente - Citalia',
  description: 'Crea perfiles completos de clientes con información personal, preferencias de servicio, historial de contacto y configuraciones personalizadas para una gestión efectiva.',
};

interface CustomerProfileCreationPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function CustomerProfileCreationPage({ searchParams }: CustomerProfileCreationPageProps) {
  const { id } = await searchParams;
  const isEditMode = Boolean(id);
  const title = isEditMode ? 'Editar Cliente' : 'Crear Cliente';

  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title={title}
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Clientes', href: '/customer-profile-management' },
            { label: title, href: '/customer-profile-creation' },
          ]}
        />

        <div className="max-w-[1400px] mx-auto px-6 py-8">
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mb-8">
            {isEditMode
              ? 'Actualiza cualquier dato del cliente: información personal, preferencias de contacto y servicio, e información adicional.'
              : 'Registra información completa del cliente incluyendo datos personales, preferencias de servicio, historial de contacto y configuraciones para una experiencia personalizada.'}
          </p>

          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
                <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
              </div>
            }
          >
            <CustomerProfileCreationInteractive />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
