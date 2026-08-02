import Icon from '@/components/ui/AppIcon';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

const EmptyState = ({ title, description, actionLabel, onAction, icon = 'SparklesIcon' }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon name={icon as any} size={40} className="text-muted-foreground" />
      </div>
      <h3 className="font-heading font-semibold text-xl text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 h-12 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-warm transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Icon name="PlusIcon" size={18} />
          <span className="font-medium">{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;