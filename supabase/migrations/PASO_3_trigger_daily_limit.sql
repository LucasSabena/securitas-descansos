-- PASO 3: Crear trigger para límite diario
-- Ejecutar este SQL después del PASO 2

DROP TRIGGER IF EXISTS validate_user_daily_limit ON reservas;

CREATE TRIGGER validate_user_daily_limit
  BEFORE INSERT OR UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION check_user_daily_limit();
