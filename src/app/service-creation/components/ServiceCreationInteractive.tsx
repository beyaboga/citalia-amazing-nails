'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import ServiceFormFields from './ServiceFormFields';
import ServicePreviewPanel from './ServicePreviewPanel';
import CategoryFormModal, { ServiceCategory } from '@/components/common/CategoryFormModal';

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  duration: string;
  availability: boolean;
  specialRequirements: string;
  photo: string;
}

const ServiceCreationInteractive = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);

  const [isHydrated, setIsHydrated] = useState(false);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    category: '',
    price: '',
    duration: '',
    availability: true,
    specialRequirements: '',
    photo: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingService, setIsLoadingService] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/service-categories');
        if (!response.ok) throw new Error('No se pudieron cargar las categorías');
        const data: ServiceCategory[] = await response.json();
        setCategories(data);
      } catch (error) {
        setErrors((prev) => ({ ...prev, category: 'No se pudieron cargar las categorías' }));
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (!editId) return;

    const loadService = async () => {
      try {
        const response = await fetch(`/api/services/${editId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'No se pudo cargar el servicio');

        setFormData({
          name: result.name,
          description: result.description || '',
          category: String(result.categoryId),
          price: String(result.price),
          duration: String(result.duration),
          availability: result.isActive,
          specialRequirements: result.specialRequirements || '',
          photo: result.image || ''
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el servicio');
      } finally {
        setIsLoadingService(false);
      }
    };

    loadService();
  }, [editId]);

  const handleFieldChange = (field: keyof ServiceFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del servicio es obligatorio';
    } else if (formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria';
    } else if (formData.description.length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres';
    }

    if (!formData.category) {
      newErrors.category = 'Debe seleccionar una categoría';
    }

    if (!formData.price) {
      newErrors.price = 'El precio es obligatorio';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        newErrors.price = 'El precio debe ser mayor a 0';
      }
    }

    if (!formData.duration) {
      newErrors.duration = 'Debe seleccionar una duración';
    } else {
      const duration = parseInt(formData.duration);
      if (isNaN(duration) || duration <= 0) {
        newErrors.duration = 'La duración debe ser mayor a 0';
      } else if (duration > 720) {
        newErrors.duration = 'La duración no puede exceder 12 horas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveService = async (isActive: boolean) => {
    setIsSaving(true);
    try {
      const response = await fetch(isEditMode ? `/api/services/${editId}` : '/api/services', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          categoryId: Number(formData.category),
          price: parseFloat(formData.price),
          durationMinutes: parseInt(formData.duration, 10),
          isActive,
          specialRequirements: formData.specialRequirements,
          imageUrl: formData.photo || null,
          imageAlt: formData.photo ? formData.name : null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al guardar el servicio');
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        router.push('/services-catalog-management');
      }, 2000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar el servicio. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndActivate = async () => {
    if (!validateForm()) {
      return;
    }
    await saveService(formData.availability);
  };

  const handleSaveAsDraft = async () => {
    if (!validateForm()) {
      return;
    }
    await saveService(false);
  };

  const handleCancel = () => {
    const hasChanges = Object.values(formData).some(value => 
      typeof value === 'string' ? value.trim() !== '' : value !== true
    );

    if (hasChanges) {
      setShowCancelDialog(true);
    } else {
      router.push('/services-catalog-management');
    }
  };

  const confirmCancel = () => {
    setShowCancelDialog(false);
    router.push('/services-catalog-management');
  };

  const handleCategoryAdded = (newCategory: ServiceCategory) => {
    setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
    setFormData((prev) => ({ ...prev, category: String(newCategory.id) }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.category;
      return newErrors;
    });
    setShowAddCategoryModal(false);
  };

  if (!isHydrated || isLoadingService) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
          </div>
          <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-error/10 border border-error text-error rounded-lg p-6">
        <p className="font-medium mb-2">{loadError}</p>
        <button
          onClick={() => router.push('/services-catalog-management')}
          className="text-sm underline"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading font-semibold text-2xl md:text-3xl text-foreground mb-2">
            {isEditMode ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
          </h2>
          <p className="text-muted-foreground">
            {isEditMode
              ? 'Actualiza la información del servicio'
              : 'Complete la información del servicio para agregarlo al catálogo'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
            <ServiceFormFields
              formData={formData}
              errors={errors}
              onFieldChange={handleFieldChange}
              categories={categories}
              isLoadingCategories={isLoadingCategories}
              onAddCategory={() => setShowAddCategoryModal(true)}
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
              <button
                onClick={handleSaveAndActivate}
                disabled={isSaving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 h-12 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 shadow-warm hover:shadow-warm-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {isSaving ? (
                  <>
                    <Icon name="ArrowPathIcon" size={18} className="animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Icon name="CheckIcon" size={18} />
                    <span>{isEditMode ? 'Guardar Cambios' : 'Guardar y Activar'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveAsDraft}
                disabled={isSaving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 h-12 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 shadow-warm hover:shadow-warm-md transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              >
                <Icon name="DocumentTextIcon" size={18} />
                <span>{isEditMode ? 'Guardar y Desactivar' : 'Guardar Borrador'}</span>
              </button>

              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-6 h-12 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
              >
                <Icon name="XMarkIcon" size={18} />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <ServicePreviewPanel formData={formData} categories={categories} />
        </div>
      </div>

      {showCancelDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg border border-border shadow-warm-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                <Icon name="ExclamationTriangleIcon" size={24} className="text-warning" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  ¿Descartar cambios?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tiene cambios sin guardar. Si continúa, se perderán todos los datos ingresados.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="flex-1 px-4 h-11 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
              >
                Continuar Editando
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 px-4 h-11 bg-error text-error-foreground rounded-lg font-medium hover:bg-error/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCategoryModal && (
        <CategoryFormModal
          onClose={() => setShowAddCategoryModal(false)}
          onSaved={handleCategoryAdded}
        />
      )}

      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-success text-success-foreground px-6 py-4 rounded-lg shadow-warm-lg flex items-center gap-3 animate-slide-up">
          <Icon name="CheckCircleIcon" size={24} />
          <div>
            <p className="font-medium">{isEditMode ? 'Servicio actualizado exitosamente' : 'Servicio guardado exitosamente'}</p>
            <p className="caption text-sm opacity-90">Redirigiendo al catálogo...</p>
          </div>
        </div>
      )}
    </>
  );
};

export default ServiceCreationInteractive;