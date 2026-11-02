-- Recordatorio de seguimiento por categoría: un mensaje para Manos y otro para Pies.
-- 'followup' queda como mensaje general para el resto de categorías (p. ej. Adicionales).
ALTER TABLE whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_event_check;
ALTER TABLE whatsapp_templates
  ADD CONSTRAINT whatsapp_templates_event_check
  CHECK (event IN ('created', 'rescheduled', 'cancelled', 'followup', 'followup_manos', 'followup_pies'));

INSERT INTO whatsapp_templates (event, enabled, body) VALUES
  (
    'followup_manos',
    true,
    'Hola {{cliente}}, ¡esperamos que estés muy bien! Ya te toca consentir tus manos en Amazing Nails. ¿Te gustaría agendar tu cita?'
  ),
  (
    'followup_pies',
    true,
    'Hola {{cliente}}, ¡esperamos que estés muy bien! Ya te toca consentir tus pies en Amazing Nails. ¿Te gustaría agendar tu cita?'
  )
ON CONFLICT (event) DO NOTHING;
