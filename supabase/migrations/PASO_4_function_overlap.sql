-- PASO 4: Crear función para validar solapamiento
-- Ejecutar este SQL después del PASO 3

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

-- Agregar comentario
COMMENT ON FUNCTION check_reservation_overlap() IS 'Previene solapamiento de horarios entre reservas';
