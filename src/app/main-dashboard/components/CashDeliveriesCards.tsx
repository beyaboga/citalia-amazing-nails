import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import { formatLempiras } from '@/lib/payroll';

interface CashDeliveriesCardsProps {
  data: { pendingTotal: number; pendingCash: number; pendingTransfers: number; lastDelivery: string | null };
}

/** Entregas de Caja — indicadores rápidos del spec, enlazan al módulo. */
const CashDeliveriesCards = ({ data }: CashDeliveriesCardsProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <h3 className="text-xl font-heading font-semibold text-foreground mb-4">Entregas de Caja</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/cash-deliveries?tab=pending" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary">
          <Icon name="BanknotesIcon" size={20} className="text-primary mb-2" />
          <p className="text-2xl font-heading font-semibold text-foreground tabular-nums">{formatLempiras(data.pendingTotal)}</p>
          <p className="caption text-xs text-muted-foreground">Pendiente de Entregar</p>
        </Link>
        <Link href="/cash-deliveries?tab=pending" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary">
          <Icon name="CurrencyDollarIcon" size={20} className="text-success mb-2" />
          <p className="text-2xl font-heading font-semibold text-foreground tabular-nums">{formatLempiras(data.pendingCash)}</p>
          <p className="caption text-xs text-muted-foreground">Pendiente en Efectivo</p>
        </Link>
        <Link href="/cash-deliveries?tab=pending" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary">
          <Icon name="CreditCardIcon" size={20} className="text-secondary mb-2" />
          <p className="text-2xl font-heading font-semibold text-foreground tabular-nums">{formatLempiras(data.pendingTransfers)}</p>
          <p className="caption text-xs text-muted-foreground">Pendiente en Transferencias</p>
        </Link>
        <Link href="/cash-deliveries?tab=history" className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary">
          <Icon name="ClockIcon" size={20} className="text-muted-foreground mb-2" />
          <p className="text-sm font-heading font-semibold text-foreground">{data.lastDelivery ?? 'Sin entregas aún'}</p>
          <p className="caption text-xs text-muted-foreground">Última Entrega</p>
        </Link>
      </div>
    </div>
  );
};

export default CashDeliveriesCards;
