'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

export interface ServiceCategory {
  id: number;
  name: string;
  icon: string | null;
}

interface CategoryFormModalProps {
  category?: ServiceCategory | null;
  onClose: () => void;
  onSaved: (category: ServiceCategory) => void;
  onDeleted?: (id: number) => void;
  allowDelete?: boolean;
  canDelete?: boolean;
  deleteBlockedMessage?: string;
  apiPath?: string;
  entityLabel?: string;
  namePlaceholder?: string;
}

const ICON_OPTIONS = [
  'SparklesIcon',
  'HandRaisedIcon',
  'HeartIcon',
  'StarIcon',
  'ShieldCheckIcon',
  'PaintBrushIcon',
  'ScissorsIcon',
  'BeakerIcon',
  'SunIcon',
  'FireIcon',
  'FingerPrintIcon',
  'SwatchIcon',
  'FaceSmileIcon',
  'MoonIcon',
  'BuildingStorefrontIcon',
  'InstagramIcon',
  'FacebookIcon',
  'XIcon',
  'YoutubeIcon',
];

const CategoryFormModal = ({
  category,
  onClose,
  onSaved,
  onDeleted,
  allowDelete = false,
  canDelete = true,
  deleteBlockedMessage,
  apiPath = '/api/service-categories',
  entityLabel = 'Categoría',
  namePlaceholder = 'Ej: Manos',
}: CategoryFormModalProps) => {
  const isEditMode = Boolean(category);
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon && ICON_OPTIONS.includes(category.icon) ? category.icon : ICON_OPTIONS[0]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(
        isEditMode ? `${apiPath}/${category!.id}` : apiPath,
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), icon }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || `Error al guardar ${entityLabel.toLowerCase()}`);
      }

      onSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error al guardar ${entityLabel.toLowerCase()}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`${apiPath}/${category.id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || `Error al eliminar ${entityLabel.toLowerCase()}`);
      }

      onDeleted?.(category.id);
      onClose();
    } catch (err) {
      setConfirmingDelete(false);
      setError(err instanceof Error ? err.message : `Error al eliminar ${entityLabel.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border shadow-warm-xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg text-foreground">
            {isEditMode ? `Editar ${entityLabel}` : `Agregar ${entityLabel}`}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-smooth"
            aria-label="Cerrar"
          >
            <Icon name="XMarkIcon" size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="categoryName" className="block text-sm font-medium text-foreground mb-2">
              Nombre <span className="text-error">*</span>
            </label>
            <input
              type="text"
              id="categoryName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className={`w-full px-4 h-12 rounded-lg border ${
                error ? 'border-error' : 'border-border'
              } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth`}
              placeholder={namePlaceholder}
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-error flex items-center gap-1">
                <Icon name="ExclamationCircleIcon" size={16} />
                {error}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Ícono</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIcon(option)}
                  className={`h-11 rounded-lg border flex items-center justify-center transition-smooth ${
                    icon === option
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                  aria-label={option}
                  aria-pressed={icon === option}
                >
                  <Icon name={option as any} size={20} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {isEditMode && allowDelete && (
          <div className="mt-4 pt-4 border-t border-border">
            {!canDelete ? (
              <p className="caption text-muted-foreground text-sm flex items-center gap-1">
                <Icon name="InformationCircleIcon" size={16} className="flex-shrink-0" />
                {deleteBlockedMessage || 'En uso — no se puede eliminar'}
              </p>
            ) : confirmingDelete ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-foreground">¿Eliminar {entityLabel.toLowerCase()}?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    disabled={isDeleting}
                    className="h-9 px-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-smooth disabled:opacity-50"
                  >
                    No
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-9 px-3 rounded-lg text-sm font-medium bg-error text-error-foreground hover:bg-error/90 transition-smooth disabled:opacity-50"
                  >
                    {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-2 text-sm font-medium text-error hover:underline"
              >
                <Icon name="TrashIcon" size={16} />
                Eliminar {entityLabel.toLowerCase()}
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Icon name="ArrowPathIcon" size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryFormModal;
