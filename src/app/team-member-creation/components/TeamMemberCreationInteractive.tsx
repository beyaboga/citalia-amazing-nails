'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PersonalInfoSection from './PersonalInfoSection';
import RoleSection, { AvailableRole } from './RoleSection';
import ProfessionalInfoSection, { ProfessionalInfoData } from './ProfessionalInfoSection';
import ScheduleSection, { DaySchedule } from './ScheduleSection';
import PaymentSection, { PaymentData } from './PaymentSection';
import PaymentAuditHistory from './PaymentAuditHistory';
import TeamMemberPreviewPanel from './TeamMemberPreviewPanel';
import UnsavedChangesModal from './UnsavedChangesModal';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';

export interface TeamMemberData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    terminationDate: string;
  };
  roleId: number | null;
  professionalInfo: ProfessionalInfoData;
  schedule: DaySchedule[];
  payment: PaymentData;
}

const DEFAULT_PAYMENT: PaymentData = {
  scheme: 'FIXED',
  monthlySalary: 0,
  payFrequency: 'MONTHLY',
  calculationMode: 'PER_SERVICE',
  rules: [],
  tiers: [],
};

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { dayOfWeek: 1, dayLabel: 'Lunes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
  { dayOfWeek: 2, dayLabel: 'Martes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
  { dayOfWeek: 3, dayLabel: 'Miércoles', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
  { dayOfWeek: 4, dayLabel: 'Jueves', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
  { dayOfWeek: 5, dayLabel: 'Viernes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
  { dayOfWeek: 6, dayLabel: 'Sábado', enabled: true, slots: [{ start: '10:00', end: '16:00' }] },
  { dayOfWeek: 0, dayLabel: 'Domingo', enabled: false, slots: [{ start: '10:00', end: '14:00' }] },
];

const TeamMemberCreationInteractive = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = Boolean(editId);
  const { can } = useSession();
  const canConfigurePayment = can('payroll.configure');

  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [roles, setRoles] = useState<AvailableRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingMember, setIsLoadingMember] = useState(isEditMode);
  const [loadError, setLoadError] = useState('');
  const [jobTitleError, setJobTitleError] = useState('');

  const [memberData, setMemberData] = useState<TeamMemberData>({
    personalInfo: { name: '', email: '', phone: '', password: '', confirmPassword: '', terminationDate: '' },
    roleId: null,
    professionalInfo: {
      isBookable: true,
      jobTitle: '',
      employeeCode: '',
      colorHex: '#B84A78',
      hireDate: '',
      bio: '',
    },
    schedule: DEFAULT_SCHEDULE,
    payment: DEFAULT_PAYMENT,
  });

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!editId) return;

    const loadMember = async () => {
      setIsLoadingMember(true);
      setLoadError('');
      try {
        const response = await fetch(`/api/team-members/${editId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error || 'No se pudo cargar el miembro del equipo');

        // El horario guardado solo trae los días que existen en la base; se mezcla
        // sobre el horario por defecto para conservar las etiquetas y el orden.
        const savedByDay = new Map<number, { enabled: boolean; slots: { start: string; end: string }[] }>(
          (result.schedule ?? []).map((day: any) => [day.dayOfWeek, { enabled: day.enabled, slots: day.slots }])
        );

        setMemberData({
          personalInfo: {
            name: result.name ?? '',
            email: result.email ?? '',
            phone: result.phone ?? '',
            password: '',
            confirmPassword: '',
            terminationDate: result.terminationDate ?? '',
          },
          roleId: result.roleId ?? null,
          professionalInfo: {
            isBookable: Boolean(result.isBookable),
            jobTitle: result.jobTitle ?? '',
            employeeCode: result.employeeCode ?? '',
            colorHex: result.colorHex ?? '#B84A78',
            hireDate: result.hireDate ?? '',
            bio: result.bio ?? '',
          },
          schedule: DEFAULT_SCHEDULE.map((day) => {
            const saved = savedByDay.get(day.dayOfWeek);
            if (!saved) return day;
            return {
              ...day,
              enabled: saved.enabled,
              slots: saved.slots.length > 0 ? saved.slots : day.slots,
            };
          }),
          payment: result.payment
            ? {
                scheme: result.payment.scheme ?? 'FIXED',
                monthlySalary: result.payment.monthlySalary ?? 0,
                payFrequency: result.payment.payFrequency ?? 'MONTHLY',
                calculationMode: result.payment.calculationMode ?? 'PER_SERVICE',
                rules: Array.isArray(result.payment.rules) ? result.payment.rules : [],
                tiers: Array.isArray(result.payment.tiers) ? result.payment.tiers : [],
              }
            : DEFAULT_PAYMENT,
        });
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el miembro del equipo');
      } finally {
        setIsLoadingMember(false);
      }
    };

    loadMember();
  }, [editId]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const response = await fetch('/api/roles');
        if (!response.ok) throw new Error('No se pudieron cargar los roles');
        const data: AvailableRole[] = await response.json();
        setRoles(data);
      } catch (error) {
        // La sección muestra su propio estado vacío si esto falla
      } finally {
        setIsLoadingRoles(false);
      }
    };

    loadRoles();
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

  const handlePersonalInfoChange = (data: TeamMemberData['personalInfo']) => {
    setMemberData((prev) => ({ ...prev, personalInfo: data }));
    setHasUnsavedChanges(true);
  };

  const handleRoleChange = (roleId: number) => {
    setMemberData((prev) => ({ ...prev, roleId }));
    setHasUnsavedChanges(true);
  };

  const handleProfessionalInfoChange = (data: ProfessionalInfoData) => {
    setMemberData((prev) => ({ ...prev, professionalInfo: data }));
    setHasUnsavedChanges(true);
    if (data.jobTitle.trim()) setJobTitleError('');
  };

  const handleScheduleChange = (schedule: DaySchedule[]) => {
    setMemberData((prev) => ({ ...prev, schedule }));
    setHasUnsavedChanges(true);
  };

  const handlePaymentChange = (payment: PaymentData) => {
    setMemberData((prev) => ({ ...prev, payment }));
    setHasUnsavedChanges(true);
  };

  const validateMember = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { personalInfo, roleId, professionalInfo } = memberData;

    if (!personalInfo.name.trim()) errors.push('El nombre es obligatorio');
    if (!personalInfo.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
      errors.push('Correo electrónico inválido');
    }
    // Al editar, la contraseña vacía significa "conservar la actual".
    if (!isEditMode || personalInfo.password) {
      if (!personalInfo.password || personalInfo.password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
      }
      if (personalInfo.password !== personalInfo.confirmPassword) {
        errors.push('Las contraseñas no coinciden');
      }
    }
    if (!roleId) errors.push('Debe seleccionar un rol');
    if (professionalInfo.isBookable && !professionalInfo.jobTitle.trim()) {
      errors.push('El puesto es obligatorio para personal reservable');
      setJobTitleError('El puesto es obligatorio');
    }
    if (
      personalInfo.terminationDate &&
      professionalInfo.hireDate &&
      personalInfo.terminationDate < professionalInfo.hireDate
    ) {
      errors.push('La fecha de finalización no puede ser anterior a la de contratación');
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    const validation = validateMember();

    if (!validation.isValid) {
      alert('Por favor completa todos los campos obligatorios:\n' + validation.errors.join('\n'));
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const response = await fetch(isEditMode ? `/api/team-members/${editId}` : '/api/team-members', {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Error al guardar el miembro del equipo');
      }

      setHasUnsavedChanges(false);
      setShowSuccessMessage(true);

      setTimeout(() => {
        router.push('/team-member-management');
      }, 2000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Error al guardar. Por favor intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      router.push('/team-member-management');
    }
  };

  const handleConfirmCancel = () => {
    setHasUnsavedChanges(false);
    router.push('/team-member-management');
  };

  if (!isHydrated || isLoadingMember) {
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
          onClick={() => router.push('/team-member-management')}
          className="mt-4 h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Volver al equipo
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PersonalInfoSection
            data={memberData.personalInfo}
            onChange={handlePersonalInfoChange}
            isEditMode={isEditMode}
          />

          <RoleSection
            roleId={memberData.roleId}
            onChange={handleRoleChange}
            roles={roles}
            isLoading={isLoadingRoles}
          />

          <ProfessionalInfoSection
            data={memberData.professionalInfo}
            onChange={handleProfessionalInfoChange}
            jobTitleError={jobTitleError}
          />

          {memberData.professionalInfo.isBookable && (
            <ScheduleSection data={memberData.schedule} onChange={handleScheduleChange} />
          )}

          {memberData.professionalInfo.isBookable && canConfigurePayment && (
            <PaymentSection data={memberData.payment} onChange={handlePaymentChange} />
          )}

          {isEditMode && editId && memberData.professionalInfo.isBookable && canConfigurePayment && (
            <PaymentAuditHistory userId={editId} />
          )}

          {saveError && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon name="ExclamationCircleIcon" size={20} className="text-error flex-shrink-0" />
              <span className="text-sm text-error font-medium">{saveError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleSave}
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
                  {isEditMode ? 'Guardar Cambios' : 'Guardar Miembro del Equipo'}
                </>
              )}
            </button>

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
            <TeamMemberPreviewPanel memberData={memberData} roles={roles} />
          </div>
        </div>
      </div>

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
            {isEditMode ? 'Cambios guardados exitosamente' : 'Miembro del equipo guardado exitosamente'}
          </span>
        </div>
      )}
    </>
  );
};

export default TeamMemberCreationInteractive;
