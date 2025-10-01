-- PASO 2: Crear función para validar límite diario
-- Ejecutar este SQL después del PASO 1

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

-- Agregar comentario
COMMENT ON FUNCTION check_user_daily_limit() IS 'Valida que un usuario no exceda 30 minutos totales por turno';
