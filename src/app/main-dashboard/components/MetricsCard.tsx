import Icon from '@/components/ui/AppIcon';

interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** Contra qué se compara el trend (ej. "vs período anterior"). */
  comparisonLabel?: string;
  subtitle?: string;
  /** Comparación mes en curso vs mes anterior al mismo día (letra pequeña). */
  mom?: { current: string; previous: string; pct: number; isPositive: boolean; label: string };
}

const MetricsCard = ({ title, value, icon, trend, comparisonLabel = 'vs período anterior', subtitle, mom }: MetricsCardProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-warm hover:shadow-warm-md transition-smooth border border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="caption text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-heading font-semibold text-foreground">{value}</h3>
          {subtitle && (
            <p className="caption text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon name={icon as any} size={24} className="text-primary" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          <Icon 
            name={trend.value >= 0 ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} 
            size={16} 
            className={trend.isPositive ? 'text-success' : 'text-error'} 
          />
          <span className={`caption font-medium ${trend.isPositive ? 'text-success' : 'text-error'}`}>
            {trend.value > 0 ? '+' : trend.value < 0 ? '−' : ''}{Math.abs(trend.value)}%
          </span>
          <span className="caption text-muted-foreground ml-1">{comparisonLabel}</span>
        </div>
      )}
      {mom && (
        <p className="text-[11px] leading-tight text-muted-foreground mt-2">
          <span className={`font-medium ${mom.isPositive ? 'text-success' : 'text-error'}`}>
            {mom.pct > 0 ? '+' : ''}{mom.pct}%
          </span>{' '}
          MoM ({mom.label}): {mom.current} vs {mom.previous}
        </p>
      )}
    </div>
  );
};

export default MetricsCard;