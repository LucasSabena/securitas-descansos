-- PASO 1: Agregar constraint de duración máxima
-- Este script es idempotente (se puede ejecutar múltiples veces sin error)
-- Ejecutar en Supabase Dashboard → SQL Editor

-- Eliminar constraint si ya existe
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS check_max_duration;

-- Crear constraint
ALTER TABLE reservas 
ADD CONSTRAINT check_max_duration 
CHECK (duration_minutes > 0 AND duration_minutes <= 30);

-- Comentario de documentación
COMMENT ON CONSTRAINT check_max_duration ON reservas IS 'Limita cada reserva a un máximo de 30 minutos';

-- ✅ Verificación: Deberías ver el constraint creado
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conname = 'check_max_duration';

-- ❌ Test (descomenta para probar - debe fallar):
-- INSERT INTO reservas (user_name, shift, start_time, end_time, duration_minutes)
-- VALUES ('test', 'Mañana', NOW(), NOW() + INTERVAL '50 minutes', 50);
