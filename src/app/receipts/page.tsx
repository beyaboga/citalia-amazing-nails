import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import Icon from '@/components/ui/AppIcon';
import ReceiptsInteractive from './components/ReceiptsInteractive';

export const metadata: Metadata = {
  title: 'Recibos - Citalia',
  description: 'Consulta y reimpresión de recibos de pago emitidos.',
};

export default function ReceiptsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Recibos"
          actions={
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="ReceiptPercentIcon" size={20} className="text-primary" />
            </div>
          }
        />
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <ReceiptsInteractive />
          </div>
        </div>
      </main>
    </div>
  );
}
