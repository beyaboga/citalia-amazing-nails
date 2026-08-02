'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/AppIcon';
import CategoryFormModal, { ServiceCategory } from '@/components/common/CategoryFormModal';

interface CategoryWithCount extends ServiceCategory {
  serviceCount: number;
}

const ServiceCategoriesInteractive = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithCount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/service-categories');
      if (!response.ok) throw new Error('No se pudieron cargar las categorías');
      const data: CategoryWithCount[] = await response.json();
      setCategories(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isHydrated) loadCategories();
  }, [isHydrated, loadCategories]);

  const handleSaved = () => {
    setShowCreateModal(false);
    setEditingCategory(null);
    loadCategories();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/service-categories/${deleteTarget.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Error al eliminar la categoría');
      setDeleteTarget(null);
      loadCategories();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Error al eliminar la categoría');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">Administra las categorías disponibles para el catálogo de servicios</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Icon name="PlusIcon" size={20} />
          <span className="font-medium">Nueva Categoría</span>
        </button>
      </div>

      {loadError && (
        <div className="bg-error/10 border border-error text-error rounded-lg p-4">{loadError}</div>
      )}

      {!loadError && isLoading && (
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      )}

      {!loadError && !isLoading && categories.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <Icon name="TagIcon" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">No hay categorías</h3>
          <p className="text-muted-foreground">Agrega la primera categoría para empezar a clasificar servicios</p>
        </div>
      )}

      {!loadError && !isLoading && categories.length > 0 && (
        <div className="bg-card rounded-lg border border-border divide-y divide-border">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name={(category.icon || 'SparklesIcon') as any} size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{category.name}</p>
                <p className="caption text-muted-foreground text-sm">
                  {category.serviceCount} {category.serviceCount === 1 ? 'servicio' : 'servicios'}
                </p>
              </div>
              <button
                onClick={() => setEditingCategory(category)}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-muted transition-smooth"
                aria-label={`Editar ${category.name}`}
              >
                <Icon name="PencilIcon" size={18} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => {
                  setDeleteTarget(category);
                  setDeleteError(null);
                }}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-error/10 transition-smooth"
                aria-label={`Eliminar ${category.name}`}
              >
                <Icon name="TrashIcon" size={18} className="text-error" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingCategory) && (
        <CategoryFormModal
          category={editingCategory}
          onClose={() => {
            setShowCreateModal(false);
            setEditingCategory(null);
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-error" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">¿Eliminar categoría?</h3>
                <p className="text-sm text-muted-foreground">
                  ¿Seguro que deseas eliminar <strong>{deleteTarget.name}</strong>?
                  {deleteTarget.serviceCount > 0 && (
                    <> Tiene {deleteTarget.serviceCount} {deleteTarget.serviceCount === 1 ? 'servicio asociado' : 'servicios asociados'} y no podrá eliminarse hasta reasignarlos.</>
                  )}
                </p>
                {deleteError && (
                  <p className="mt-2 text-sm text-error flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size={16} />
                    {deleteError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 px-4 h-11 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 h-11 bg-error text-error-foreground rounded-lg font-medium hover:bg-error/90 transition-smooth disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCategoriesInteractive;
