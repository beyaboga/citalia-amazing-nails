'use client';

import Icon from '@/components/ui/AppIcon';
import CopyButton from '@/components/common/CopyButton';
import type { TechnicianNotice } from '@/lib/technicianNotice';

interface TechnicianNoticeModalProps {
  notice: TechnicianNotice;
  /** Se llama al enviar, copiar o descartar: en todos los casos se sigue con el flujo. */
  onDone: () => void;
}

/**
 * Ofrece avisarle por WhatsApp a la estilista a la que otra persona le agendó una cita.
 * La cita ya está guardada: esto solo decide si se le avisa ahora o no.
 */
const TechnicianNoticeModal = ({ notice, onDone }: TechnicianNoticeModalProps) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" aria-hidden="true" />

    <div className="relative bg-card rounded-lg border border-border shadow-warm-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon name="BellAlertIcon" size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">Avisar a la estilista</h2>
          <p className="caption text-xs text-muted-foreground">
            Esta cita es para {notice.technicianName}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="bg-card rounded-lg rounded-tl-none border border-border p-4">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{notice.message}</p>
          </div>
        </div>

        {!notice.url && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
            <Icon name="ExclamationTriangleIcon" size={16} className="text-warning flex-shrink-0 mt-0.5" />
            <span className="text-xs text-foreground">
              {notice.technicianName} no tiene un teléfono válido registrado, así que no se puede
              abrir el chat. Puedes copiar el mensaje y enviarlo por otro medio.
            </span>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-border flex flex-col sm:flex-row gap-2">
        {notice.url && (
          <a
            href={notice.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDone}
            className="flex-1 h-11 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth flex items-center justify-center gap-2"
          >
            <Icon name="ChatBubbleLeftRightIcon" size={18} />
            Enviar por WhatsApp
          </a>
        )}
        <CopyButton text={notice.message} label="Copiar mensaje" />
        <button
          type="button"
          onClick={onDone}
          className="flex-1 h-11 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-smooth"
        >
          Ahora no
        </button>
      </div>
    </div>
  </div>
);

export default TechnicianNoticeModal;
