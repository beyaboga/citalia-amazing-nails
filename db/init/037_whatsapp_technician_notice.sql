-- Aviso a la estilista cuando otra persona le agenda una cita. Plantilla editable en
-- Configuración → Mensajes de WhatsApp; el mensaje se ofrece al guardar la cita, solo
-- cuando quien agenda no es la misma estilista.
ALTER TABLE whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_event_check;
ALTER TABLE whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_event_check
  CHECK (event IN ('created', 'rescheduled', 'cancelled', 'followup', 'followup_manos', 'followup_pies', 'reminder', 'technician'));

INSERT INTO whatsapp_templates (event, enabled, body) VALUES
  (
    'technician',
    true,
    'Hola {{profesional}}, tienes una cita nueva 💅
*{{cliente}}*
{{fecha}} a las {{hora}}
{{servicios}}'
  )
ON CONFLICT (event) DO NOTHING;
