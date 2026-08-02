'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonalInfoSection from './PersonalInfoSection';
import CommunicationPreferencesSection from './CommunicationPreferencesSection';
import ServicePreferencesSection from './ServicePreferencesSection';
import AdditionalInfoSection from './AdditionalInfoSection';
import ProfilePreviewPanel from './ProfilePreviewPanel';
import UnsavedChangesModal from './UnsavedChangesModal';
import Icon from '@/components/ui/AppIcon';
import type { AvailableService, AvailableTechnician } from './ServicePreferencesSection';
import type { CommunicationMethod } from './CommunicationPreferencesSection';
import CategoryFormModal from '@/components/common/CategoryFormModal';

export interface CustomerProfileData {
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    birthDate: string;
    photo: string;
    status: 'active' | 'inactive' | 'vip';
  };
  communicationPreferences: {
    preferredContact: string[];
    marketingConsent: boolean;
    appointmentReminders: boolean;
    promotionalEmails: boolean;
  };
  servicePreferences: {
    favoriteServices: string[];
    preferredTechnician: string;
    preferredTimeSlots: string[];
    colorPreferences: string;
  };
  additionalInfo: {
    allergies: string;
    specialRequirements: string;
    referralTags: string[];
    emergencyContact: string;
    emergencyPhone: string;
  };
}

const CustomerProfileCreationInteractive = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);

  // Pantalla a la que volver tras crear el cliente (ej. la nueva cita en curso).
  // Solo se aceptan rutas internas para no redirigir a un sitio externo.
  const returnToParam = searchParams.get('returnTo');
  const returnTo = returnToParam && returnToParam.startsWith('/') ? returnToParam : null;

  // Destino por defecto al terminar; el flujo de "volver" lo sobreescribe.
  const goAfterSave = (newCustomerId?: number) => {
    if (returnTo) {
      // Se reanexa el cliente recién creado para que la pantalla origen lo preseleccione.
      const separator = returnTo.includes('?') ? '&' : '?';
      const suffix = newCustomerId ? `${separator}customerId=${newCustomerId}` : '';
      router.push(`${returnTo}${suffix}`);
    } else {
      router.push('/customer-profile-management');
    }
  };

  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(isEditMode);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [services, setServices] = useState<AvailableService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [technicians, setTechnicians] = useState<AvailableTechnician[]>([]);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState(true);
  const [contactMethods, setContactMethods] = useState<CommunicationMethod[]>([]);
  const [isLoadingContactMethods, setIsLoadingContactMethods] = useState(true);
  const [showAddContactMethodModal, setShowAddContactMethodModal] = useState(false);
  const [editingContactMethod, setEditingContactMethod] = useState<CommunicationMethod | null>(null);

  const [profileData, setProfileData] = useState<CustomerProfileData>({
    personalInfo: {
      name: '',
      phone: '',
      email: '',
      address: '',
      birthDate: '',
      photo: '',
      status: 'active'
    },
    communicationPreferences: {
      preferredContact: [],
      marketingConsent: false,
      appointmentReminders: true,
      promotionalEmails: false
    },
    servicePreferences: {
      favoriteServices: [],
      preferredTechnician: '',
      preferredTimeSlots: [],
      colorPreferences: ''
    },
    additionalInfo: {
      allergies: '',
      specialRequirements: '',
      referralTags: [],
      emergencyContact: '',
      emergencyPhone: ''
    }
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!editId) return;

    const loadCustomer = async () => {
      setIsLoadingCustomer(true);
      setLoadError('');
      try {
        const response = await fetch(`/api/customers/${editId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'No se pudo cargar el cliente');

        setProfileData({
          personalInfo: {
            name: String(result.name ?? '').trim(),
            phone: result.phone ?? '',
            email: result.email ?? '',
            address: result.address ?? '',
            birthDate: result.birthdayIso ? String(result.birthdayIso).slice(0, 10) : '',
            photo: result.imageUrl ?? '',
            status: result.status ?? 'active'
          },
          communicationPreferences: {
            preferredContact: result.preferredContactMethods ?? [],
            marketingConsent: Boolean(result.marketingConsent),
            appointmentReminders: result.appointmentReminders ?? true,
            promotionalEmails: Boolean(result.promotionalEmails)
          },
          servicePreferences: {
            favoriteServices: (result.favoriteServiceIds ?? []).map((serviceId: number) => String(serviceId)),
            preferredTechnician: result.preferredTechnicianId ? String(result.preferredTechnicianId) : '',
            preferredTimeSlots: result.preferredTimeSlots ?? [],
            colorPreferences: result.colorPreferences ?? ''
          },
          additionalInfo: {
            allergies: result.allergies ?? '',
            specialRequirements: result.specialRequirements ?? '',
            referralTags: result.referralTags ?? [],
            emergencyContact: result.emergencyContact ?? '',
            emergencyPhone: result.emergencyPhone ?? ''
          }
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el cliente');
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    loadCustomer();
  }, [editId]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (!response.ok) throw new Error('No se pudieron cargar los servicios');
        const data: AvailableService[] = await response.json();
        setServices(data);
      } catch (error) {
        // La sección de preferencias muestra su propio estado vacío si esto falla
      } finally {
        setIsLoadingServices(false);
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        const response = await fetch('/api/team-members');
        if (!response.ok) throw new Error('No se pudo cargar el equipo');
        const data: { userId: number; name: string; jobTitle: string | null; isBookable: boolean; hasAccess: boolean }[] =
          await response.json();
        // Solo personal reservable y con acceso vigente puede ser técnico preferido.
        setTechnicians(
          data
            .filter((member) => member.isBookable && member.hasAccess)
            .map(({ userId, name, jobTitle }) => ({ userId, name, jobTitle }))
        );
      } catch (error) {
        // El selector muestra su propio estado vacío si esto falla
      } finally {
        setIsLoadingTechnicians(false);
      }
    };

    loadTechnicians();
  }, []);

  useEffect(() => {
    const loadContactMethods = async () => {
      try {
        const response = await fetch('/api/communication-methods');
        if (!response.ok) throw new Error('No se pudieron cargar los métodos de contacto');
        const data: CommunicationMethod[] = await response.json();
        setContactMethods(data);
      } catch (error) {
        // La sección muestra la lista vacía si esto falla
      } finally {
        setIsLoadingContactMethods(false);
      }
    };

    loadContactMethods();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSectionChange = (section: keyof CustomerProfileData, data: any) => {
    setProfileData(prev => ({ ...prev, [section]: data }));
    setHasUnsavedChanges(true);
  };

  const validateProfile = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!profileData.personalInfo.name.trim()) {
      errors.push('El nombre es obligatorio');
    }
    if (profileData.personalInfo.phone.trim() && !/^\d{8}$/.test(profileData.personalInfo.phone.replace(/\s/g, ''))) {
      errors.push('El teléfono debe tener 8 dígitos');
    }
    if (profileData.personalInfo.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.personalInfo.email)) {
      errors.push('Correo electrónico inválido');
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleSaveAndActivate = async () => {
    const validation = validateProfile();
    
    if (!validation.isValid) {
      alert('Por favor completa todos los campos obligatorios:\n' + validation.errors.join('\n'));
      return;
    }

    setIsSaving(true);

    try {
      const { personalInfo, communicationPreferences, servicePreferences, additionalInfo } = profileData;

      // Al editar se manda el payload plano que espera PATCH; al crear, el
      // agrupado por secciones que espera POST.
      const payload = isEditMode
        ? {
            name: personalInfo.name.trim(),
            email: personalInfo.email.trim(),
            phone: personalInfo.phone.trim(),
            status: personalInfo.status,
            birthday: personalInfo.birthDate || null,
            address: personalInfo.address,
            imageUrl: personalInfo.photo,
            preferredContactMethods: communicationPreferences.preferredContact,
            marketingConsent: communicationPreferences.marketingConsent,
            appointmentReminders: communicationPreferences.appointmentReminders,
            promotionalEmails: communicationPreferences.promotionalEmails,
            preferredTimeSlots: servicePreferences.preferredTimeSlots,
            colorPreferences: servicePreferences.colorPreferences,
            preferredTechnicianId: servicePreferences.preferredTechnician || null,
            favoriteServiceIds: servicePreferences.favoriteServices.map((serviceId) => Number(serviceId)),
            allergies: additionalInfo.allergies,
            specialRequirements: additionalInfo.specialRequirements,
            referralTags: additionalInfo.referralTags,
            emergencyContact: additionalInfo.emergencyContact,
            emergencyPhone: additionalInfo.emergencyPhone
          }
        : profileData;

      const response = await fetch(isEditMode ? `/api/customers/${editId}` : '/api/customers', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al guardar el perfil');
      }

      setHasUnsavedChanges(false);
      setShowSuccessMessage(true);

      setTimeout(() => {
        // Al crear desde otra pantalla (ej. una cita), se vuelve a ella con el
        // cliente recién creado ya seleccionado.
        goAfterSave(isEditMode ? undefined : result?.id);
      }, 2000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al guardar el perfil. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsDraft = async () => {
    setIsSaving(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const drafts = JSON.parse(localStorage.getItem('customerDrafts') || '[]');
      const newDraft = {
        id: Date.now(),
        ...profileData,
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      drafts.push(newDraft);
      localStorage.setItem('customerDrafts', JSON.stringify(drafts));
      
      setHasUnsavedChanges(false);
      setShowSuccessMessage(true);
      
      setTimeout(() => {
        router.push('/customer-profile-management');
      }, 2000);
    } catch (error) {
      alert('Error al guardar el borrador. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      goAfterSave();
    }
  };

  const handleConfirmCancel = () => {
    setHasUnsavedChanges(false);
    goAfterSave();
  };

  const handleContactMethodSaved = (savedMethod: CommunicationMethod) => {
    if (editingContactMethod) {
      const oldName = editingContactMethod.name;
      setContactMethods((prev) =>
        prev
          .map((m) => (m.id === savedMethod.id ? { ...savedMethod, customerCount: m.customerCount } : m))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setProfileData((prev) => ({
        ...prev,
        communicationPreferences: {
          ...prev.communicationPreferences,
          preferredContact: prev.communicationPreferences.preferredContact.map((name) =>
            name === oldName ? savedMethod.name : name
          )
        }
      }));
      setEditingContactMethod(null);
    } else {
      setContactMethods((prev) => [...prev, savedMethod].sort((a, b) => a.name.localeCompare(b.name)));
      setProfileData((prev) => ({
        ...prev,
        communicationPreferences: {
          ...prev.communicationPreferences,
          preferredContact: [...prev.communicationPreferences.preferredContact, savedMethod.name]
        }
      }));
      setHasUnsavedChanges(true);
      setShowAddContactMethodModal(false);
    }
  };

  const handleContactMethodDeleted = (deletedId: number) => {
    const deletedMethod = contactMethods.find((m) => m.id === deletedId);
    setContactMethods((prev) => prev.filter((m) => m.id !== deletedId));
    if (deletedMethod) {
      setProfileData((prev) => ({
        ...prev,
        communicationPreferences: {
          ...prev.communicationPreferences,
          preferredContact: prev.communicationPreferences.preferredContact.filter((name) => name !== deletedMethod.name)
        }
      }));
    }
    setEditingContactMethod(null);
  };

  if (!isHydrated || isLoadingCustomer) {
    return (
      <div className="space-y-6">
        <div className="h-96 bg-card rounded-lg border border-border animate-pulse" />
        <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <Icon name="ExclamationCircleIcon" size={48} className="text-error mx-auto mb-4" />
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{loadError}</h3>
        <button
          onClick={() => router.push('/customer-profile-management')}
          className="mt-4 h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Volver a clientes
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoSection
            data={profileData.personalInfo}
            onChange={(data) => handleSectionChange('personalInfo', data)}
            isEditMode={isEditMode}
          />
          
          <CommunicationPreferencesSection
            data={profileData.communicationPreferences}
            onChange={(data) => handleSectionChange('communicationPreferences', data)}
            contactMethods={contactMethods}
            isLoadingContactMethods={isLoadingContactMethods}
            onAddContactMethod={() => setShowAddContactMethodModal(true)}
            onEditContactMethod={(method) => setEditingContactMethod(method)}
          />
          
          <ServicePreferencesSection
            data={profileData.servicePreferences}
            onChange={(data) => handleSectionChange('servicePreferences', data)}
            services={services}
            isLoadingServices={isLoadingServices}
            technicians={technicians}
            isLoadingTechnicians={isLoadingTechnicians}
          />
          
          <AdditionalInfoSection
            data={profileData.additionalInfo}
            onChange={(data) => handleSectionChange('additionalInfo', data)}
          />

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleSaveAndActivate}
              disabled={isSaving}
              className="flex-1 h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icon name="CheckCircleIcon" size={20} />
                  {isEditMode ? 'Guardar Cambios' : 'Guardar y Activar'}
                </>
              )}
            </button>

            {!isEditMode && !returnTo && (
              <button
                onClick={handleSaveAsDraft}
                disabled={isSaving}
                className="flex-1 h-12 px-6 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Icon name="DocumentTextIcon" size={20} />
                Guardar Borrador
              </button>
            )}

            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="h-12 px-6 bg-background border border-border text-foreground rounded-lg font-medium hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Icon name="XMarkIcon" size={20} />
              Cancelar
            </button>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <ProfilePreviewPanel profileData={profileData} services={services} />
          </div>
        </div>
      </div>

      {showAddContactMethodModal && (
        <CategoryFormModal
          apiPath="/api/communication-methods"
          entityLabel="Método de Contacto"
          namePlaceholder="Ej: Instagram"
          onClose={() => setShowAddContactMethodModal(false)}
          onSaved={handleContactMethodSaved}
        />
      )}

      {editingContactMethod && (
        <CategoryFormModal
          category={editingContactMethod}
          apiPath="/api/communication-methods"
          entityLabel="Método de Contacto"
          namePlaceholder="Ej: Instagram"
          allowDelete
          canDelete={!editingContactMethod.customerCount}
          deleteBlockedMessage={`En uso por ${editingContactMethod.customerCount} cliente(s) — no se puede eliminar`}
          onClose={() => setEditingContactMethod(null)}
          onSaved={handleContactMethodSaved}
          onDeleted={handleContactMethodDeleted}
        />
      )}

      {showUnsavedModal && (
        <UnsavedChangesModal
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowUnsavedModal(false)}
        />
      )}

      {showSuccessMessage && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-4 rounded-lg shadow-warm-lg flex items-center gap-3 z-50 animate-slide-up">
          <Icon name="CheckCircleIcon" size={24} />
          <span className="font-medium">
            {isEditMode ? 'Cambios guardados exitosamente' : 'Perfil guardado exitosamente'}
          </span>
        </div>
      )}
    </>
  );
};

export default CustomerProfileCreationInteractive;