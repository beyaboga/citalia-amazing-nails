'use client';

import Icon from '@/components/ui/AppIcon';
import TagsCombobox from './TagsCombobox';

interface AdditionalInfoData {
  allergies: string;
  specialRequirements: string;
  referralTags: string[];
  emergencyContact: string;
  emergencyPhone: string;
}

interface AdditionalInfoSectionProps {
  data: AdditionalInfoData;
  onChange: (data: AdditionalInfoData) => void;
}

const AdditionalInfoSection = ({ data, onChange }: AdditionalInfoSectionProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon name="DocumentTextIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Información Adicional</h2>
          <p className="caption text-muted-foreground text-sm">Alergias, requisitos especiales y contacto de emergencia</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="allergies" className="block text-sm font-medium text-foreground mb-2">
            Alergias o Sensibilidades
          </label>
          <textarea
            id="allergies"
            name="allergies"
            value={data.allergies}
            onChange={handleChange}
            rows={2}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
            placeholder="Ej: Alergia al látex, sensibilidad a ciertos químicos"
          />
          <p className="caption text-muted-foreground text-xs mt-1">
            Importante para seleccionar productos adecuados
          </p>
        </div>

        <div>
          <label htmlFor="specialRequirements" className="block text-sm font-medium text-foreground mb-2">
            Requisitos Especiales
          </label>
          <textarea
            id="specialRequirements"
            name="specialRequirements"
            value={data.specialRequirements}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth resize-none"
            placeholder="Ej: Necesita silla especial, prefiere ambiente tranquilo, requiere más tiempo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            ¿Cómo nos conoció?
          </label>
          <TagsCombobox
            selected={data.referralTags}
            onChange={(tags) => onChange({ ...data, referralTags: tags })}
          />
          <p className="caption text-muted-foreground text-xs mt-1">
            Nos ayuda a mejorar nuestras estrategias de marketing
          </p>
        </div>

        <div className="border-t border-border pt-4 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="ExclamationTriangleIcon" size={18} className="text-accent" />
            <h3 className="font-medium text-foreground">Contacto de Emergencia</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="emergencyContact" className="block text-sm font-medium text-foreground mb-2">
                Nombre del Contacto
              </label>
              <input
                type="text"
                id="emergencyContact"
                name="emergencyContact"
                value={data.emergencyContact}
                onChange={handleChange}
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="emergencyPhone" className="block text-sm font-medium text-foreground mb-2">
                Teléfono de Emergencia
              </label>
              <input
                type="tel"
                id="emergencyPhone"
                name="emergencyPhone"
                value={data.emergencyPhone}
                onChange={handleChange}
                className="w-full px-4 h-12 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
                placeholder="Ej: 98765432"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoSection;