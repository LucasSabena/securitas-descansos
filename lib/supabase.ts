import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ESTA ES LA FUNCIÓN CORRECTA Y SIMPLIFICADA
// No necesita las variables de entorno aquí, las tomará del contexto.
// Es la forma recomendada por Supabase para componentes de cliente.
export const createClient = () => createClientComponentClient()