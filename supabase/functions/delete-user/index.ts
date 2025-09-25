import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Esta función borrará todas las reservas cuyo START_TIME esté en el pasado.
Deno.serve(async (req) => {
  try {
    // Para llamar a esta función se necesita una clave de servicio, por seguridad.
    const authHeader = req.headers.get('Authorization')!
    if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    
    // Crear un cliente de Supabase con permisos de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date().toISOString()

    // Borrar todas las reservas cuya hora de inicio ya pasó
    const { error, count } = await supabaseAdmin
      .from('reservas')
      .delete()
      .lt('start_time', now) // lt = less than (menor que)

    if (error) throw error

    return new Response(JSON.stringify({ message: `Cleanup successful, ${count} old reservations deleted.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})