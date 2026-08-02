import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

interface CustomerFollowupCardsProps {
  data: { today: number; upcoming: number; overdue: number; lost: number };
}

const TILES = [
  { key: 'today' as const, label: 'Deben Regresar Hoy', icon: 'CalendarDaysIcon', status: 'TODAY', color: 'text-primary' },
  { key: 'upcoming' as const, label: 'Clientes Próximos', icon: 'ClockIcon', status: 'UPCOMING', color: 'text-warning' },
  { key: 'overdue' as const, label: 'Clientes Atrasados', icon: 'ExclamationTriangleIcon', status: 'OVERDUE', color: 'text-error' },
  { key: 'lost' as const, label: 'Clientes Perdidos', icon: 'UserMinusIcon', status: 'LOST', color: 'text-muted-foreground' },
];

/** Seguimiento de clientes por categoría — cuatro accesos rápidos al módulo. */
const CustomerFollowupCards = ({ data }: CustomerFollowupCardsProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-warm border border-border">
      <h3 className="text-xl font-heading font-semibold text-foreground mb-4">Seguimiento de Clientes</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {TILES.map((tile) => (
          <Link
            key={tile.key}
            href={`/customer-followup?status=${tile.status}`}
            className="rounded-lg border border-border p-4 hover:bg-muted/40 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Icon name={tile.icon} size={20} className={`${tile.color} mb-2`} />
            <p className="text-2xl font-heading font-semibold text-foreground tabular-nums">{data[tile.key]}</p>
            <p className="caption text-xs text-muted-foreground">{tile.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CustomerFollowupCards;
