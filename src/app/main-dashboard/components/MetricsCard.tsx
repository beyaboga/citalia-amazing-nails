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
}

const MetricsCard = ({ title, value, icon, trend, comparisonLabel = 'vs período anterior', subtitle }: MetricsCardProps) => {
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
            name={trend.isPositive ? 'ArrowTrendingUpIcon' : 'ArrowTrendingDownIcon'} 
            size={16} 
            className={trend.isPositive ? 'text-success' : 'text-error'} 
          />
          <span className={`caption font-medium ${trend.isPositive ? 'text-success' : 'text-error'}`}>
            {Math.abs(trend.value)}%
          </span>
          <span className="caption text-muted-foreground ml-1">{comparisonLabel}</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;