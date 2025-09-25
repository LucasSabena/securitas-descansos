'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ReservaFlexible } from '@/types'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

type UserProfile = { id: string; name: string; isGuest: boolean; }

export default function FlexibleSchedulePage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [reservas, setReservas] = useState<ReservaFlexible[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState('')
  const [duracionMinutos, setDuracionMinutos] = useState(10)
  const [notas, setNotas] = useState('')

  // Calcular hora de fin basada en hora de inicio y duración
  const calcularHoraFin = useCallback((inicio: string, duracion: number): string => {
    if (!inicio) return ''
    const [horas, minutos] = inicio.split(':').map(Number)
    const totalMinutos = horas * 60 + minutos + duracion
    const nuevasHoras = Math.floor(totalMinutos / 60)
    const nuevosMinutos = totalMinutos % 60
    return `${nuevasHoras.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`
  }, [])

  const horaFin = calcularHoraFin(horaInicio, duracionMinutos)

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      
      const { data: profile } = await supabase.auth.getUser()
      if (profile.user) {
        setUser({
          id: profile.user.id,
          name: profile.user.user_metadata.name || profile.user.email || '',
          isGuest: false
        })
      }
    }
    
    checkAuth()
  }, [supabase, router])

  // Cargar reservas
  const cargarReservas = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reservas_flexibles')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', selectedDate)
        .order('hora_inicio')

      if (error) {
        console.error('Error cargando reservas:', error)
        toast.error('Error cargando reservas')
        return
      }

      setReservas(data || [])
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error cargando reservas')
    } finally {
      setLoading(false)
    }
  }, [user, selectedDate, supabase])

  useEffect(() => {
    if (user) {
      cargarReservas()
    }
  }, [user, cargarReservas])

  // Crear nueva reserva
  const crearReserva = useCallback(async () => {
    if (!user || !horaInicio || !duracionMinutos) {
      toast.error('Por favor completa todos los campos')
      return
    }

    if (duracionMinutos < 5 || duracionMinutos > 60) {
      toast.error('La duración debe estar entre 5 y 60 minutos')
      return
    }

    try {
      const nuevaReserva = {
        user_id: user.id,
        fecha: selectedDate,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        duracion_minutos: duracionMinutos,
        estado: 'activa' as const,
        notas: notas.trim() || null
      }

      const { error } = await supabase
        .from('reservas_flexibles')
        .insert([nuevaReserva])

      if (error) {
        console.error('Error creando reserva:', error)
        toast.error('Error creando la reserva')
        return
      }

      toast.success('Reserva creada exitosamente')
      
      // Limpiar formulario
      setHoraInicio('')
      setDuracionMinutos(10)
      setNotas('')
      
      // Recargar reservas
      cargarReservas()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error creando la reserva')
    }
  }, [user, selectedDate, horaInicio, horaFin, duracionMinutos, notas, supabase, cargarReservas])

  // Eliminar reserva
  const eliminarReserva = useCallback(async (reservaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta reserva?')) return

    try {
      const { error } = await supabase
        .from('reservas_flexibles')
        .delete()
        .eq('id', reservaId)

      if (error) {
        console.error('Error eliminando reserva:', error)
        toast.error('Error eliminando la reserva')
        return
      }

      toast.success('Reserva eliminada')
      cargarReservas()
    } catch (err) {
      console.error('Error:', err)
      toast.error('Error eliminando la reserva')
    }
  }, [supabase, cargarReservas])

  // Cerrar sesión
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-primary-text">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      <header className="bg-secondary border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-secondary-text">Descansos Securitas</h1>
            <p className="text-sm text-muted">Horarios Flexibles</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary-text">Hola, {user.name}</span>
            <button
              onClick={handleSignOut}
              className="text-sm px-4 py-2 bg-dark-error text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Selector de fecha */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-primary-text mb-4">Selecciona la fecha</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full max-w-xs px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
          />
        </section>

        {/* Formulario para nueva reserva */}
        <section className="mb-8 p-6 bg-secondary rounded-xl border border-border">
          <h2 className="text-lg font-semibold text-secondary-text mb-4">Nueva Reserva de Descanso</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Hora de inicio */}
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2">
                Hora de inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-4 py-2 bg-primary border border-border rounded-lg text-primary-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
              />
            </div>

            {/* Duración */}
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2">
                Duración (minutos)
              </label>
              <select
                value={duracionMinutos}
                onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                className="w-full px-4 py-2 bg-primary border border-border rounded-lg text-primary-text focus:outline-none focus:ring-2 focus:ring-dark-primary"
              >
                <option value={5}>5 minutos</option>
                <option value={10}>10 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={20}>20 minutos</option>
                <option value={25}>25 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            {/* Hora de fin (calculada) */}
            <div>
              <label className="block text-sm font-medium text-secondary-text mb-2">
                Hora de fin
              </label>
              <input
                type="time"
                value={horaFin}
                disabled
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted cursor-not-allowed"
              />
            </div>
          </div>

          {/* Notas opcionales */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-text mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Agrega alguna nota sobre tu descanso..."
              rows={2}
              className="w-full px-4 py-2 bg-primary border border-border rounded-lg text-primary-text focus:outline-none focus:ring-2 focus:ring-dark-primary resize-none"
            />
          </div>

          <button
            onClick={crearReserva}
            disabled={!horaInicio || !duracionMinutos}
            className="w-full md:w-auto px-6 py-2 bg-dark-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crear Reserva
          </button>
        </section>

        {/* Lista de reservas */}
        <section>
          <h2 className="text-lg font-semibold text-primary-text mb-4">
            Tus Reservas para {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted">Cargando reservas...</div>
            </div>
          ) : reservas.length === 0 ? (
            <div className="text-center py-8 bg-secondary rounded-xl border border-border">
              <div className="text-muted">No tienes reservas para esta fecha</div>
              <div className="text-sm text-muted mt-2">Crea tu primera reserva usando el formulario de arriba</div>
            </div>
          ) : (
            <div className="space-y-3">
              {reservas.map((reserva) => (
                <motion.div
                  key={reserva.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-secondary rounded-xl border border-border flex justify-between items-center"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="font-semibold text-secondary-text">
                        {reserva.hora_inicio} - {reserva.hora_fin}
                      </span>
                      <span className="text-sm bg-dark-success/20 text-dark-success px-2 py-1 rounded">
                        {reserva.duracion_minutos} min
                      </span>
                      <span className="text-sm bg-dark-info/20 text-dark-info px-2 py-1 rounded">
                        {reserva.estado}
                      </span>
                    </div>
                    {reserva.notas && (
                      <div className="text-sm text-muted">{reserva.notas}</div>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarReserva(reserva.id)}
                    className="ml-4 px-3 py-1 bg-dark-error text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Eliminar
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}