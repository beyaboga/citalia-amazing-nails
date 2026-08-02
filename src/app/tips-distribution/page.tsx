import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import Icon from '@/components/ui/AppIcon';
import TipsDistributionInteractive from './components/TipsDistributionInteractive';

export const metadata: Metadata = {
  title: 'Distribución de propinas - Citalia',
  description: 'Consulta de propinas pendientes y registro de su distribución entre el equipo.',
};

export default function TipsDistributionPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />

      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Propinas"
          actions={
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="SparklesIcon" size={20} className="text-primary" />
            </div>
          }
        />
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <TipsDistributionInteractive />
          </div>
        </div>
      </main>
    </div>
  );
}
