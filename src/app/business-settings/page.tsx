import type { Metadata } from 'next';
import NavigationSidebar from '@/components/common/NavigationSidebar';
import PageHeader from '@/components/common/PageHeader';
import BusinessSettingsInteractive from './components/BusinessSettingsInteractive';
import Icon from '@/components/ui/AppIcon';

export const metadata: Metadata = {
  title: 'Configuración del Negocio - Citalia',
  description: 'Configure los horarios de operación, días no laborables, políticas de reserva y preferencias del sistema para la gestión del salón de uñas.',
};

export default function BusinessSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavigationSidebar />
      
      <main className="md:ml-[280px] min-h-screen">
        <PageHeader
          title="Configuración del Negocio"
          actions={
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="Cog6ToothIcon" size={20} className="text-primary" />
            </div>
          }
        />

        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Icon name="InformationCircleIcon" size={20} className="text-accent-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-accent-foreground mb-1">
                    Configuración Operacional
                  </h3>
                  <p className="caption text-accent-foreground/80">
                    Configure los parámetros operacionales del salón. Los cambios se aplicarán inmediatamente y afectarán la disponibilidad de citas y el comportamiento del sistema.
                  </p>
                </div>
              </div>
            </div>

            <BusinessSettingsInteractive />

            <div className="mt-8 p-6 bg-muted/30 border border-border rounded-lg">
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4">
                Información Adicional
              </h3>
              <div className="space-y-3 caption text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="flex-shrink-0 mt-0.5 text-success" />
                  <p>
                    Los horarios de operación determinan cuándo los clientes pueden agendar citas en el sistema.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="flex-shrink-0 mt-0.5 text-success" />
                  <p>
                    Los días no laborables bloquean automáticamente la agenda para esas fechas específicas.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="flex-shrink-0 mt-0.5 text-success" />
                  <p>
                    Las políticas de reserva ayudan a reducir cancelaciones de último momento y no-shows.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="flex-shrink-0 mt-0.5 text-success" />
                  <p>
                    Las preferencias del sistema personalizan la experiencia de uso según sus necesidades.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}