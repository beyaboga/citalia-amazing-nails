-- Mensaje de recordatorio del Seguimiento de Clientes (antes escrito fijo en el código).
-- Pasa a ser una plantilla más de whatsapp_templates, editable en
-- Configuración → Mensajes de WhatsApp. Variables: {{cliente}} y {{categoria}}.
ALTER TABLE whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_event_check;
ALTER TABLE whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_event_check
  CHECK (event IN ('created', 'rescheduled', 'cancelled', 'followup'));

INSERT INTO whatsapp_templates (event, enabled, body) VALUES
  (
    'followup',
    true,
    'Hola {{cliente}}, ¡esperamos que estés muy bien! Notamos que ya te toca tu próxima visita de {{categoria}}. ¿Te gustaría agendar tu cita?'
  )
ON CONFLICT (event) DO NOTHING;
