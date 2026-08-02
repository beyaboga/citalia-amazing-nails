import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import TaxSettingsInteractive from './components/TaxSettingsInteractive';

export const metadata: Metadata = {
  title: 'Configuración de Impuestos - Citalia',
  description: 'Administra los impuestos (ISV) que se usan para calcular comisiones sobre el precio sin impuestos.',
};

export default function TaxSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Configuración de Impuestos"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Configuración de Impuestos', href: '/tax-settings' },
          ]}
        />

        <div className="p-6">
          <p className="caption text-muted-foreground mb-4">
            El impuesto activo se usa para calcular comisiones sobre el precio sin impuestos.
          </p>
          <TaxSettingsInteractive />
        </div>
      </main>
    </div>
  );
}
