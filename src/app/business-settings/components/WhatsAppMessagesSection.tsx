'use client';

import { useState, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useSession } from '@/lib/useSession';
import {
  WHATSAPP_VARIABLES,
  WHATSAPP_EVENT_LABELS,
  renderTemplate,
  sampleVariables,
  type WhatsAppEvent,
  type WhatsAppTemplate,
} from '@/lib/whatsapp';

const EVENT_HINTS: Record<WhatsAppEvent, string> = {
  created: 'Se genera al guardar una cita nueva.',
  rescheduled: 'Se genera cuando una cita cambia de fecha u hora.',
  cancelled: 'Se genera cuando una cita se marca como cancelada.',
};

const WhatsAppMessagesSection = () => {
  const { can } = useSession();
  const canEdit = can('settings.manage');

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [activeEvent, setActiveEvent] = useState<WhatsAppEvent>('created');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/whatsapp-templates')
      .then((res) => (res.ok ? res.json() : []))
      .then(setTemplates)
      .catch(() => setError('No se pudieron cargar los mensajes'))
      .finally(() => setIsLoading(false));
  }, []);

  const active = templates.find((t) => t.event === activeEvent) ?? null;

  const update = (changes: Partial<WhatsAppTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.event === activeEvent ? { ...t, ...changes } : t))
    );
  };

  // La vista previa usa datos de ejemplo: enseña cómo le llegará el mensaje a la
  // clienta sin necesidad de crear una cita de prueba.
  const preview = active ? renderTemplate(active.body, sampleVariables()) : '';

  const insertVariable = (key: string) => {
    if (!active) return;
    const field = document.getElementById('whatsappBody') as HTMLTextAreaElement | null;
    const token = `{{${key}}}`;

    if (!field) {
      update({ body: `${active.body}${token}` });
      return;
    }

    // Se inserta donde está el cursor, que es donde el usuario espera verlo.
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const next = `${active.body.slice(0, start)}${token}${active.body.slice(end)}`;
    update({ body: next });

    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async () => {
    if (!active) return;
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/whatsapp-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: active.event,
          body: active.body,
          enabled: active.enabled,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'No se pudo guardar el mensaje');

      setMessage('Mensaje guardado');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el mensaje');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-warm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
            Mensajes de WhatsApp
          </h2>
          <p className="caption text-muted-foreground">
            Configure el texto que se le envía a la clienta. Al guardar una cita el sistema
            abre WhatsApp con el mensaje ya escrito, para que salga de su propio número.
          </p>
        </div>
        <Icon name="ChatBubbleLeftRightIcon" size={24} className="text-primary" />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(WHATSAPP_EVENT_LABELS) as WhatsAppEvent[]).map((event) => {
          const template = templates.find((t) => t.event === event);
          return (
            <button
              key={event}
              type="button"
              onClick={() => setActiveEvent(event)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-smooth ${
                activeEvent === event
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {WHATSAPP_EVENT_LABELS[event]}
              {template && !template.enabled && (
                <span className="ml-2 caption text-xs opacity-70">(apagado)</span>
              )}
            </button>
          );
        })}
      </div>

      {!active ? (
        <p className="text-sm text-muted-foreground">No se encontró este mensaje.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
            <div className="flex-1 pr-4">
              <h3 className="font-medium text-foreground mb-1">Enviar este mensaje</h3>
              <p className="caption text-muted-foreground">{EVENT_HINTS[active.event]}</p>
            </div>
            <button
              type="button"
              onClick={() => update({ enabled: !active.enabled })}
              disabled={!canEdit}
              className={`w-12 h-6 rounded-full transition-smooth relative flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                active.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              aria-label={`Activar ${WHATSAPP_EVENT_LABELS[active.event]}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-smooth ${
                  active.enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="whatsappBody"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Texto del mensaje
              </label>
              <textarea
                id="whatsappBody"
                rows={14}
                value={active.body}
                onChange={(event) => update({ body: event.target.value })}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
              <p className="caption text-muted-foreground mt-1">
                Rodee una palabra con asteriscos (*así*) para que WhatsApp la muestre en negrita.
              </p>

              <div className="mt-4">
                <p className="text-sm font-medium text-foreground mb-2">
                  Datos de la cita que puede insertar
                </p>
                <div className="flex flex-wrap gap-2">
                  {WHATSAPP_VARIABLES.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable.key)}
                      disabled={!canEdit}
                      title={variable.description}
                      className="px-2.5 py-1 rounded-md border border-border bg-background text-xs font-mono text-primary hover:bg-muted transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {`{{${variable.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="block text-sm font-medium text-foreground mb-2">
                Así lo recibirá la clienta
              </p>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="bg-card rounded-lg rounded-tl-none border border-border p-4 shadow-warm">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {preview}
                  </p>
                </div>
              </div>
              <p className="caption text-muted-foreground mt-2">
                Vista previa con datos de ejemplo.
              </p>
            </div>
          </div>

          {message && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2">
              <Icon name="CheckCircleIcon" size={20} className="text-success" />
              <span className="text-sm text-success font-medium">{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2">
              <Icon name="ExclamationCircleIcon" size={20} className="text-error" />
              <span className="text-sm text-error font-medium">{error}</span>
            </div>
          )}

          {canEdit ? (
            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          ) : (
            <p className="caption text-muted-foreground pt-4 border-t border-border">
              No tiene permiso para editar la configuración.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppMessagesSection;
