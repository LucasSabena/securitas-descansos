-- ==========================================
-- MIGRACIÓN COMPLETA - VALIDACIONES DE SEGURIDAD
-- ==========================================
-- Este script aplica todas las validaciones de una sola vez
-- Es idempotente: se puede ejecutar múltiples veces sin error
-- Copiar y pegar COMPLETO en Supabase Dashboard → SQL Editor

-- ==========================================
-- PASO 1: Constraint de duración máxima
-- ==========================================
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS check_max_duration;
ALTER TABLE reservas 
ADD CONSTRAINT check_max_duration 
CHECK (duration_minutes > 0 AND duration_minutes <= 30);

COMMENT ON CONSTRAINT check_max_duration ON reservas IS 'Limita cada reserva a un máximo de 30 minutos';

-- ==========================================
-- PASO 2: Función de límite diario por usuario
-- ==========================================
CREATE OR REPLACE FUNCTION check_user_daily_limit()
RETURNS TRIGGER AS $$
DECLARE
  total_minutes INTEGER;
  user_identifier TEXT;
BEGIN
  -- Identificar al usuario (puede ser user_id o user_name para guests)
  IF NEW.user_id IS NOT NULL THEN
    user_identifier := NEW.user_id::TEXT;
  ELSE
    user_identifier := NEW.user_name;
  END IF;

  -- Calcular minutos totales del usuario en el mismo turno y día
  SELECT COALESCE(SUM(duration_minutes), 0) INTO total_minutes
  FROM reservas
  WHERE 
    -- Mismo usuario
    (
      (user_id IS NOT NULL AND user_id = NEW.user_id) OR
      (user_id IS NULL AND user_name = NEW.user_name)
    )
    -- Mismo turno
    AND shift = NEW.shift
    -- Mismo día (considerar el turno noche que cruza medianoche)
    AND DATE(start_time) = DATE(NEW.start_time)
    -- Excluir la reserva actual si es un UPDATE
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Verificar que no exceda 30 minutos
  IF (total_minutes + NEW.duration_minutes) > 30 THEN
    RAISE EXCEPTION 'Has excedido el límite de 30 minutos por turno. Ya tienes % minutos reservados.', total_minutes;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_daily_limit() IS 'Valida que un usuario no exceda 30 minutos totales por turno';

-- ==========================================
-- PASO 3: Trigger de límite diario
-- ==========================================
DROP TRIGGER IF EXISTS validate_user_daily_limit ON reservas;
CREATE TRIGGER validate_user_daily_limit
  BEFORE INSERT OR UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION check_user_daily_limit();

-- ==========================================
-- PASO 4: Función de solapamiento
-- ==========================================
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Buscar reservas que se solapen con la nueva
  SELECT COUNT(*) INTO overlapping_count
  FROM reservas
  WHERE 
    -- No contar la misma reserva en caso de UPDATE
    id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    -- Verificar solapamiento: nueva empieza antes de que termine existente Y termina después de que empiece existente
    AND NEW.start_time < end_time 
    AND NEW.end_time > start_time;

  IF overlapping_count > 0 THEN
    RAISE EXCEPTION 'Este horario se solapa con otra reserva existente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_reservation_overlap() IS 'Previene solapamiento de horarios entre reservas';

-- ==========================================
-- PASO 5: Trigger de solapamiento
-- ==========================================
DROP TRIGGER IF EXISTS validate_reservation_overlap ON reservas;
CREATE TRIGGER validate_reservation_overlap
  BEFORE INSERT OR UPDATE ON reservas
  FOR EACH ROW
  EXECUTE FUNCTION check_reservation_overlap();

-- ==========================================
-- VERIFICACIÓN FINAL
-- ==========================================
-- Ver constraint creado
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conname = 'check_max_duration';

-- Ver funciones creadas
SELECT 
  proname AS function_name,
  pg_get_function_identity_arguments(oid) AS arguments
FROM pg_proc
WHERE proname IN ('check_user_daily_limit', 'check_reservation_overlap');

-- Ver triggers creados
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'reservas'
ORDER BY trigger_name;

-- ==========================================
-- 🎉 ¡MIGRACIÓN COMPLETADA!
-- ==========================================
-- Si ves resultados en las 3 queries de verificación, todo está OK.
-- Las validaciones ahora están activas:
-- ✅ Máximo 30 minutos por reserva individual
-- ✅ Máximo 30 minutos totales por usuario por turno
-- ✅ No se permiten solapamientos de horarios
