'use client';

import Icon from '@/components/ui/AppIcon';

export interface ProfessionalInfoData {
  isBookable: boolean;
  jobTitle: string;
  employeeCode: string;
  colorHex: string;
  hireDate: string;
  bio: string;
}

interface ProfessionalInfoSectionProps {
  data: ProfessionalInfoData;
  onChange: (data: ProfessionalInfoData) => void;
  jobTitleError?: string;
}

const DEFAULT_COLOR = '#B84A78';

const ProfessionalInfoSection = ({ data, onChange, jobTitleError }: ProfessionalInfoSectionProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  const toggleBookable = () => {
    onChange({ ...data, isBookable: !data.isBookable, colorHex: data.colorHex || DEFAULT_COLOR });
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="BriefcaseIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Información Profesional</h2>
          <p className="caption text-muted-foreground text-sm">Puesto y disponibilidad para reservas</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
          <div className="pr-4">
            <p className="font-medium text-foreground">Personal reservable por clientes</p>
            <p className="caption text-muted-foreground text-sm mt-0.5">
              Tendrá su propio horario y aparecerá como técnico disponible al agendar citas
            </p>
          </div>
          <button
            type="button"
            onClick={toggleBookable}
            className={`w-12 h-6 rounded-full transition-smooth relative flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              data.isBookable ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            aria-pressed={data.isBookable}
            aria-label="Personal reservable por clientes"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                data.isBookable ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {data.isBookable && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-foreground mb-2">
                  Puesto <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  name="jobTitle"
                  value={data.jobTitle}
                  onChange={handleChange}
                  className={`w-full px-4 h-12 rounded-lg border ${
                    jobTitleError ? 'border-error' : 'border-input'
                  } bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth`}
                  placeholder="Ej: Manicurista"
                />
                {jobTitleError && (
                  <p className="mt-1 text-sm text-error flex items-center gap-1">
                    <Icon name="ExclamationCircleIcon" size={16} />
                    {jobTitleError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="employeeCode" className="block text-sm font-medium text-foreground mb-2">
                  Código de Empleado
                </label>
                <input
                  type="text"
                  id="employeeCode"
                  name="employeeCode"
                  value={data.employeeCode}
                  onChange={handleChange}
                  className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-smooth"
                  placeholder="Ej: EMP-004"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="hireDate" className="block text-sm font-medium text-foreground mb-2">
                  Fecha de Contratación
                </label>
                <input
                  type="date"
                  id="hireDate"
                  name="hireDate"
                  value={data.hireDate}
                  onChange={handleChange}
                  className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                />
              </div>

              <div>
                <label htmlFor="colorHex" className="block text-sm font-medium text-foreground mb-2">
                  Color en Calendario
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="colorHex"
                    name="colorHex"
                    value={data.colorHex || DEFAULT_COLOR}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border border-input bg-background cursor-pointer"
                  />
                  <span className="caption text-muted-foreground text-sm">
                    Identifica sus citas en la agenda
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-2">
                Biografía Breve
              </label>
              <textarea
                id="bio"
                name="bio"
                value={data.bio}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
                placeholder="Ej: Especialista en uñas acrílicas con 5 años de experiencia"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfessionalInfoSection;
