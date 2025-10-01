-- FIX: Corregir error de tipo COALESCE bigint/uuid
-- Error: "COALESCE types bigint and uuid cannot be matched"
-- Fecha: 2025-10-01

-- Solución: Cambiar la lógica para manejar correctamente NULL en INSERT

-- 1. ARREGLAR función check_user_daily_limit
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
    -- Excluir la reserva actual si es un UPDATE (si NEW.id es NULL, es un INSERT y no excluimos nada)
    AND (NEW.id IS NULL OR id != NEW.id);

  -- Verificar que no exceda 30 minutos
  IF (total_minutes + NEW.duration_minutes) > 30 THEN
    RAISE EXCEPTION 'Has excedido el límite de 30 minutos por turno. Ya tienes % minutos reservados.', total_minutes;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ARREGLAR función check_reservation_overlap
CREATE OR REPLACE FUNCTION check_reservation_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlapping_count INTEGER;
BEGIN
  -- Buscar reservas que se solapen con la nueva
  SELECT COUNT(*) INTO overlapping_count
  FROM reservas
  WHERE 
    -- No contar la misma reserva en caso de UPDATE (si NEW.id es NULL, es un INSERT)
    (NEW.id IS NULL OR id != NEW.id)
    -- Verificar solapamiento: nueva empieza antes de que termine existente Y termina después de que empiece existente
    AND NEW.start_time < end_time 
    AND NEW.end_time > start_time;

  IF overlapping_count > 0 THEN
    RAISE EXCEPTION 'Este horario se solapa con otra reserva existente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON FUNCTION check_user_daily_limit() IS 'Valida que un usuario no exceda 30 minutos totales por turno (FIXED: manejo correcto de NULL en INSERT)';
COMMENT ON FUNCTION check_reservation_overlap() IS 'Previene solapamiento de horarios entre reservas (FIXED: manejo correcto de NULL en INSERT)';
