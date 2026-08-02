-- Plantillas de los mensajes de WhatsApp que se le envían a la clienta.
--
-- El texto es libre y se edita desde Configuración → Mensajes de WhatsApp. Las
-- variables entre llaves ({{cliente}}, {{fecha}}, …) se sustituyen con los datos
-- reales de la cita al momento de generar el mensaje.
--
-- Una fila por evento: no se crean plantillas al vuelo, se editan estas.

CREATE TABLE whatsapp_templates (
  event VARCHAR(20) PRIMARY KEY CHECK (event IN ('created', 'rescheduled', 'cancelled')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  body TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Texto inicial: el mismo formato que ya se venía usando a mano. Los asteriscos
-- son la negrita de WhatsApp.
INSERT INTO whatsapp_templates (event, enabled, body) VALUES
  (
    'created',
    true,
    'Hola, {{cliente}}: Tu cita en Amazing Nails está confirmada.

*Fecha y hora*
{{fecha}} a las {{hora}}

*Servicios reservados*
{{servicios}}

*Dirección*
Plaza Isabelle, contiguo a Bac Credomatic, Local #8, Choluteca, Choluteca Department'
  ),
  (
    'rescheduled',
    false,
    'Hola, {{cliente}}: Tu cita en Amazing Nails cambió de horario.

*Nueva fecha y hora*
{{fecha}} a las {{hora}}

*Servicios reservados*
{{servicios}}

*Dirección*
Plaza Isabelle, contiguo a Bac Credomatic, Local #8, Choluteca, Choluteca Department'
  ),
  (
    'cancelled',
    false,
    'Hola, {{cliente}}: Tu cita del {{fecha}} a las {{hora}} en Amazing Nails quedó cancelada.

Si deseas reagendar, contáctanos por este mismo medio.'
  );
