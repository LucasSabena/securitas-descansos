-- PASO 5: Crear trigger para solapamiento
-- Ejecutar este SQL después del PASO 4

DROP TRIGGER IF EXISTS validate_reservation_overlap ON reservas;

CREATE TRIGGER validate_reservation_overlap
  BEFORE INSERT OR UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION check_reservation_overlap();

-- ✅ Verificación: Ver todos los triggers de la tabla reservas
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'reservas'
ORDER BY trigger_name;
