-- Función auxiliar para el botón "Actualizar" de /customer-followup: recalcula el
-- seguimiento de TODOS los clientes con citas calificadas. Los triggers de 022 solo
-- disparan hacia adelante (cuando algo CAMBIA); esto sirve para reflejar de inmediato
-- historial que ya estaba completado antes de instalar el módulo, o corregido fuera
-- del flujo normal de la app.
CREATE FUNCTION recompute_all_customer_category_stats()
RETURNS INTEGER AS $$
DECLARE
  v_customer_id INTEGER;
  v_count INTEGER := 0;
BEGIN
  FOR v_customer_id IN
    SELECT DISTINCT a.customer_id
      FROM appointments a
     WHERE a.status = 'completed'
        OR EXISTS (
          SELECT 1 FROM payments p
           WHERE p.appointment_id = a.id AND p.payment_status = 'PAID' AND p.voided_at IS NULL
        )
  LOOP
    PERFORM recompute_customer_category_stats(v_customer_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
