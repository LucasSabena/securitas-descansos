# Migraciones de Supabase

## Instrucciones para aplicar migraciones

### Opción 1: Supabase CLI (Recomendado)
```bash
supabase db push
```

### Opción 2: Dashboard de Supabase (Manual)
1. Ir a https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor/sql
2. Copiar el contenido de `20250101_add_validation_constraints.sql`
3. Ejecutar el SQL en el editor
4. Verificar que no haya errores

## Migración: 20250101_add_validation_constraints.sql

### Propósito
Agregar validaciones de seguridad server-side para prevenir:
- ✅ Reservas que excedan 30 minutos individuales
- ✅ Usuarios reservando más de 30 minutos totales por turno
- ✅ Solapamiento de horarios entre reservas

### Componentes

#### 1. Constraint: check_max_duration
- **Qué hace**: Limita cada reserva individual a máximo 30 minutos
- **Validación**: `duration_minutes > 0 AND duration_minutes <= 30`

#### 2. Función: check_user_daily_limit()
- **Qué hace**: Verifica que un usuario no exceda 30 minutos totales en un turno
- **Lógica**: 
  - Suma todos los `duration_minutes` del usuario en el mismo shift y día
  - Rechaza si total + nueva_duración > 30
- **Soporta**: Usuarios autenticados (user_id) y guests (user_name)

#### 3. Función: check_reservation_overlap()
- **Qué hace**: Previene que dos reservas se solapen en el tiempo
- **Algoritmo**: Detecta overlap si `new.start < existing.end AND new.end > existing.start`
- **Casos cubiertos**:
  - Nueva dentro de existente
  - Nueva contiene a existente
  - Solapamiento parcial por inicio
  - Solapamiento parcial por final

### Testing

Después de aplicar la migración, probar:

```sql
-- Test 1: Debe fallar - duración excede 30 min
INSERT INTO reservas (user_name, shift, start_time, end_time, duration_minutes)
VALUES ('test', 'Mañana', NOW(), NOW() + INTERVAL '50 minutes', 50);
-- Expected: ERROR - violates check constraint "check_max_duration"

-- Test 2: Debe fallar - total excede 30 min
-- (primero crear una reserva de 20 min, luego intentar otra de 15 min)
INSERT INTO reservas (user_name, shift, start_time, end_time, duration_minutes)
VALUES ('test', 'Mañana', NOW(), NOW() + INTERVAL '20 minutes', 20);
INSERT INTO reservas (user_name, shift, start_time, end_time, duration_minutes)
VALUES ('test', 'Mañana', NOW() + INTERVAL '30 minutes', NOW() + INTERVAL '45 minutes', 15);
-- Expected: ERROR - "Has excedido el límite de 30 minutos por turno"

-- Test 3: Debe fallar - solapamiento
INSERT INTO reservas (user_name, shift, start_time, end_time, duration_minutes)
VALUES ('user1', 'Tarde', '2025-10-01 15:00:00', '2025-10-01 15:20:00', 20);
INSERT INTO reservas (user_name, shift, start_time, end_time, duration_minutes)
VALUES ('user2', 'Tarde', '2025-10-01 15:10:00', '2025-10-01 15:30:00', 20);
-- Expected: ERROR - "Este horario se solapa con otra reserva existente"
```

### Rollback

Si necesitas revertir estos cambios:

```sql
-- Eliminar triggers
DROP TRIGGER IF EXISTS validate_user_daily_limit ON reservas;
DROP TRIGGER IF EXISTS validate_reservation_overlap ON reservas;

-- Eliminar funciones
DROP FUNCTION IF EXISTS check_user_daily_limit();
DROP FUNCTION IF EXISTS check_reservation_overlap();

-- Eliminar constraint
ALTER TABLE reservas DROP CONSTRAINT IF EXISTS check_max_duration;
```

## Notas Importantes

⚠️ **Datos existentes**: Estas validaciones NO afectan reservas ya creadas. Solo aplican a INSERT y UPDATE futuros.

✅ **Performance**: Los triggers son eficientes - solo se ejecutan en INSERT/UPDATE de reservas individuales.

🔒 **Seguridad**: Estas validaciones son complementarias a las validaciones client-side. Previenen manipulación directa vía API o SQL.
