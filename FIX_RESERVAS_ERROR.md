# 🚨 FIX URGENTE: Error COALESCE en Reservas

## 🔴 Problema
```
Error: COALESCE types bigint and uuid cannot be matched
```

Este error ocurre al crear una reserva porque las funciones SQL intentan usar `COALESCE(NEW.id, ...)` donde `NEW.id` es NULL en un INSERT.

## ✅ Solución

### Opción 1: Supabase Dashboard (RECOMENDADO - MÁS RÁPIDO)

1. Ve a tu proyecto en **Supabase Dashboard**
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del archivo: `supabase/migrations/FIX_coalesce_type_mismatch.sql`
5. Ejecuta la query (botón Run o Ctrl+Enter)

### Opción 2: Supabase CLI (si lo tienes instalado)

```bash
supabase db push
```

## 📝 ¿Qué hace el fix?

Cambia esta línea problemática:
```sql
-- ANTES (❌ Error)
AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
```

Por esta línea correcta:
```sql
-- DESPUÉS (✅ Funciona)
AND (NEW.id IS NULL OR id != NEW.id);
```

### Explicación:
- `NEW.id IS NULL` → Es un INSERT (nuevo registro)
- `id != NEW.id` → Es un UPDATE (excluir el registro actual)

## ⚡ Después del fix

La aplicación podrá crear reservas sin errores.

## 🧪 Para verificar que funcionó:

1. Ve al dashboard de la app
2. Intenta crear una nueva reserva
3. ✅ Debería funcionar sin el error de COALESCE

---

**Archivo de migración**: `supabase/migrations/FIX_coalesce_type_mismatch.sql`
**Fecha**: 2025-10-01
