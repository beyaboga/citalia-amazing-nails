-- Recordatorio de cita para el día anterior: una plantilla más de whatsapp_templates,
-- editable en Configuración → Mensajes de WhatsApp. Se usa desde la pantalla
-- "Recordatorios de Citas" (citas de mañana → botón de WhatsApp por clienta).
ALTER TABLE whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_event_check;
ALTER TABLE whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_event_check
  CHECK (event IN ('created', 'rescheduled', 'cancelled', 'followup', 'followup_manos', 'followup_pies', 'reminder'));

INSERT INTO whatsapp_templates (event, enabled, body) VALUES
  (
    'reminder',
    true,
    'Hola {{cliente}}, ¡esperamos que estés muy bien! 🌸 Te recordamos con cariño que te esperamos en Amazing Nails.

*Fecha y hora*
{{fecha}} a las {{hora}}

*Servicios reservados*
{{servicios}}

Si necesitas cambiar tu horario, escríbenos con toda confianza. ¡Nos da mucho gusto verte! 💕'
  )
ON CONFLICT (event) DO NOTHING;
