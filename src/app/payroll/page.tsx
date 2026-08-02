import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import PayrollInteractive from './components/PayrollInteractive';

export const metadata: Metadata = {
  title: 'Nómina - Citalia',
  description: 'Pago a empleados: sueldo del período, comisiones y adelantos.',
};

export default function PayrollPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Nómina"
          breadcrumbItems={[
            { label: 'Inicio', href: '/main-dashboard' },
            { label: 'Nómina', href: '/payroll' },
          ]}
        />

        <div className="p-6">
          <PayrollInteractive />
        </div>
      </main>
    </div>
  );
}
