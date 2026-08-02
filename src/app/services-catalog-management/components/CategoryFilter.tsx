'use client';

import Icon from '@/components/ui/AppIcon';

interface Category {
  id: string;
  label: string;
  icon: string;
  count: number;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const CategoryFilter = ({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onCategoryChange('all')}
        className={`
          flex items-center gap-2 px-4 h-10 rounded-lg whitespace-nowrap transition-smooth
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${
            activeCategory === 'all' ?'bg-primary text-primary-foreground shadow-warm' :'bg-card border border-border text-foreground hover:bg-muted'
          }
        `}
      >
        <Icon name="Squares2X2Icon" size={18} />
        <span className="caption font-medium">Todos</span>
        <span
          className={`
          caption px-2 py-0.5 rounded-full text-xs font-medium
          ${activeCategory === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}
        `}
        >
          {categories.reduce((sum, cat) => sum + cat.count, 0)}
        </span>
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`
            flex items-center gap-2 px-4 h-10 rounded-lg whitespace-nowrap transition-smooth
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            ${
              activeCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-warm'
                : 'bg-card border border-border text-foreground hover:bg-muted'
            }
          `}
        >
          <Icon name={category.icon as any} size={18} />
          <span className="caption font-medium">{category.label}</span>
          <span
            className={`
            caption px-2 py-0.5 rounded-full text-xs font-medium
            ${activeCategory === category.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}
          >
            {category.count}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;