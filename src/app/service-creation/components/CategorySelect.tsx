'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface CategoryOption {
  id: number;
  name: string;
}

interface CategorySelectProps {
  categories: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  onAddCategory: () => void;
  error?: boolean;
  isLoading?: boolean;
}

const DOT_COLORS = ['#A78BFA', '#F472B6', '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#818CF8', '#2DD4BF'];

function getDotColor(id: number) {
  return DOT_COLORS[id % DOT_COLORS.length];
}

const CategorySelect = ({ categories, value, onChange, onAddCategory, error, isLoading }: CategorySelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selected = categories.find((c) => String(c.id) === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !isLoading && setIsOpen((prev) => !prev)}
        disabled={isLoading}
        className={`w-full px-4 h-12 rounded-lg border ${
          error ? 'border-error' : 'border-border'
        } bg-background text-foreground flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {selected ? (
          <>
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: getDotColor(selected.id) }}
            />
            <span className="flex-1 text-left truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">
            {isLoading ? 'Cargando categorías...' : 'Seleccionar categoría'}
          </span>
        )}
        <Icon
          name="ChevronDownIcon"
          size={20}
          className={`text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full bg-card border border-border rounded-lg shadow-warm-lg overflow-hidden">
          <ul className="max-h-64 overflow-y-auto py-1">
            {categories.map((cat) => {
              const isSelected = String(cat.id) === value;
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(cat.id));
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 h-11 hover:bg-muted transition-smooth text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getDotColor(cat.id) }}
                    />
                    <span className="flex-1 truncate text-foreground">{cat.name}</span>
                    {isSelected && <Icon name="CheckIcon" size={18} className="text-foreground flex-shrink-0" />}
                  </button>
                </li>
              );
            })}
            {categories.length === 0 && !isLoading && (
              <li className="px-4 py-3 text-sm text-muted-foreground">No hay categorías todavía</li>
            )}
          </ul>
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddCategory();
              }}
              className="w-full flex items-center gap-2 px-4 h-11 text-primary hover:bg-primary/5 transition-smooth text-left font-medium"
            >
              <Icon name="PlusIcon" size={18} />
              Añadir categoría
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
