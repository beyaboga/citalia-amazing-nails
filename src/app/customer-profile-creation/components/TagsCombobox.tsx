'use client';

import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Tag {
  id: number;
  name: string;
}

interface TagsComboboxProps {
  selected: string[];
  onChange: (tags: string[]) => void;
}

const TagsCombobox = ({ selected, onChange }: TagsComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/customer-tags')
      .then((res) => res.json())
      .then((data: Tag[]) => setTags(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredTags = normalizedQuery
    ? tags.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
    : tags;
  const exactMatch = tags.some((t) => t.name.toLowerCase() === normalizedQuery);
  const canCreate = normalizedQuery.length > 0 && !exactMatch;

  const toggleTag = (name: string) => {
    onChange(selected.includes(name) ? selected.filter((t) => t !== name) : [...selected, name]);
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/customer-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Error al crear la etiqueta');

      setTags((prev) =>
        prev.some((t) => t.id === result.id) ? prev : [...prev, result].sort((a, b) => a.name.localeCompare(b.name))
      );
      if (!selected.includes(result.name)) {
        onChange([...selected, result.name]);
      }
      setQuery('');
    } catch (error) {
      // El input conserva el texto para que el usuario pueda reintentar
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && canCreate) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 h-12 rounded-lg border border-border bg-background text-foreground flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
      >
        <span className={`flex-1 text-left truncate text-sm ${selected.length === 0 ? 'text-muted-foreground' : ''}`}>
          {selected.length > 0 ? selected.join(', ') : 'Seleccionar...'}
        </span>
        <Icon
          name="ChevronDownIcon"
          size={20}
          className={`text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full bg-card border border-border rounded-lg shadow-warm-lg overflow-hidden">
          <ul className="max-h-56 overflow-y-auto py-1">
            {isLoading ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">Cargando...</li>
            ) : filteredTags.length === 0 && !canCreate ? (
              <li className="px-4 py-3 text-sm text-muted-foreground">No hay etiquetas todavía</li>
            ) : (
              filteredTags.map((tag) => (
                <li key={tag.id}>
                  <label className="w-full flex items-center gap-3 px-4 h-10 hover:bg-muted transition-smooth cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(tag.name)}
                      onChange={() => toggleTag(tag.name)}
                      className="w-4 h-4 rounded border-muted-foreground text-primary focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-foreground truncate">{tag.name}</span>
                  </label>
                </li>
              ))
            )}
            {canCreate && (
              <li>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full flex items-center gap-2 px-4 h-10 text-primary hover:bg-primary/5 transition-smooth text-left text-sm font-medium disabled:opacity-50"
                >
                  <Icon name="PlusIcon" size={16} />
                  {isCreating ? 'Creando...' : `Crear "${query.trim()}"`}
                </button>
              </li>
            )}
          </ul>
          <div className="border-t border-border p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Seleccionar o crear una etiqueta"
              className="w-full px-3 h-9 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsCombobox;
