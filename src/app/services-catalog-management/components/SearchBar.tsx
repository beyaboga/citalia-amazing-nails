'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const SearchBar = ({ onSearch, placeholder = 'Buscar servicios...' }: SearchBarProps) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Icon name="MagnifyingGlassIcon" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-12 pr-12 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth focus:outline-none focus:ring-2 focus:ring-primary rounded"
          aria-label="Limpiar búsqueda"
        >
          <Icon name="XMarkIcon" size={20} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;