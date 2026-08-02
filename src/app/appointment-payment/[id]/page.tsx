import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import Icon from '@/components/ui/AppIcon';
import PaymentInteractive from './PaymentInteractive';

export const metadata: Metadata = {
  title: 'Cobrar cita - Citalia',
  description: 'Registro de pago, propina y recibo de una cita.',
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AppointmentPaymentPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Cobrar cita"
          actions={
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="BanknotesIcon" size={20} className="text-primary" />
            </div>
          }
        />

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <PaymentInteractive appointmentId={Number(id)} />
          </div>
        </div>
      </main>
    </div>
  );
}
