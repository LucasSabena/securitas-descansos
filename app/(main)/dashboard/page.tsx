'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { 
  CalendarIcon, 
  ClockIcon, 
  PersonIcon, 
  ReloadIcon,
  TargetIcon,
  PlusIcon
} from '@radix-ui/react-icons'

type UserProfile = { id: string; name: string; isGuest: boolean; }
type Turno = { id: string; label: string; startHour: number; endHour: number; }
type Reserva = { id: string; start_time: string; end_time: string; user_id: string; user_name: string; duration_minutes: number; }

const TURNOS: Turno[] = [
  { id: 'manana', label: '06:45 - 14:45', startHour: 6, endHour: 15 },
  { id: 'tarde', label: '14:45 - 23:45', startHour: 14, endHour: 24 },
  { id: 'noche', label: '23:45 - 06:45', startHour: 23, endHour: 31 },
];
const MAX_MINUTES = 30;

const getTurnoDateRange = (turno: Turno): { start: Date; end: Date } => {
  const now = new Date();
  let turnoStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), turno.startHour, 45, 0, 0);
  
  if (turno.id === 'noche' && now.getHours() < 7) {
    turnoStart = new Date(turnoStart.getTime() - 24 * 60 * 60 * 1000); // Subtract 1 day
  }
  
  const endHour = turno.endHour >= 24 ? turno.endHour - 24 : turno.endHour;
  let turnoEnd = new Date(turnoStart.getFullYear(), turnoStart.getMonth(), turnoStart.getDate(), endHour, 45, 0, 0);
  if(turno.endHour >= 24) {
    turnoEnd = new Date(turnoEnd.getTime() + 24 * 60 * 60 * 1000); // Add 1 day
  }

  return { start: turnoStart, end: turnoEnd };
}

const getCurrentActiveTurno = () => {
  const currentHour = new Date().getHours();
  if (currentHour >= 6 && currentHour < 14) return TURNOS[0];
  if (currentHour >= 14 && currentHour < 23) return TURNOS[1];
  if (currentHour >= 23 || currentHour < 6) return TURNOS[2];
  return TURNOS[1];
};

// Función para agrupar reservas por horas
const groupReservasByHour = (reservas: Reserva[]) => {
  const groups: { [key: string]: Reserva[] } = {};
  
  reservas
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .forEach((reserva) => {
      const hour = new Date(reserva.start_time).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!groups[hourKey]) {
        groups[hourKey] = [];
      }
      groups[hourKey].push(reserva);
    });
  
  return groups;
};

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [allReservas, setAllReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(getCurrentActiveTurno);
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // Estados para horario personalizado
  const [customTime, setCustomTime] = useState('')
  const [customDuration, setCustomDuration] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeTurno = useMemo(() => {
    const currentHour = currentTime.getHours();
    if (currentHour >= 6 && currentHour < 14) return TURNOS[0];
    if (currentHour >= 14 && currentHour < 23) return TURNOS[1];
    if (currentHour >= 23 || currentHour < 6) return TURNOS[2];
    return TURNOS[1];
  }, [currentTime]);

  const filteredReservas = useMemo(() => {
    if (!selectedTurno) return [];
    const { start, end } = getTurnoDateRange(selectedTurno);
    return allReservas.filter(r => {
      const reservaStart = new Date(r.start_time);
      return reservaStart >= start && reservaStart < end;
    });
  }, [allReservas, selectedTurno]);

  const minutesReserved = useMemo(() => {
    if (!user || !selectedTurno) return 0;
    const { start, end } = getTurnoDateRange(selectedTurno);
    return allReservas
      .filter(r => {
        const isMyReservation = user.isGuest ? r.user_name === user.name : r.user_id === user.id;
        const reservaStart = new Date(r.start_time);
        return isMyReservation && reservaStart >= start && reservaStart < end;
      })
      .reduce((acc, r) => acc + r.duration_minutes, 0);
  }, [allReservas, user, selectedTurno]);

  const canReserveMore = minutesReserved < MAX_MINUTES;

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', session.user.id).single();
        if(profile) setUser({ id: session.user.id, name: profile.display_name, isGuest: false });
      } else {
        const guestData = localStorage.getItem('guestUser');
        if (guestData) setUser(JSON.parse(guestData));
      }
    };
    fetchUserProfile();
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    const fetchReservas = async () => {
      setLoading(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data, error } = await supabase.from('reservas').select('*').gte('created_at', yesterday.toISOString());
      if (error) toast.error('Error al cargar reservas.');
      else setAllReservas(data || []);
      setLoading(false);
    };
    fetchReservas();
    const channel = supabase.channel('realtime-reservas').on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, () => fetchReservas()).subscribe();
    return () => { supabase.removeChannel(channel) };
  }, [user, supabase]);





  const handleDeleteReservation = useCallback(async (reservationId: string) => {
    if (!user || user.isGuest) return;
    const isConfirmed = confirm('¿Estás seguro de que quieres cancelar esta reserva?');
    if (isConfirmed) {
      const loadingToast = toast.loading('Cancelando reserva...');
      const originalReservas = allReservas;
      setAllReservas(current => current.filter(r => r.id !== reservationId));
      const { error } = await supabase.from('reservas').delete().eq('id', reservationId);
      toast.dismiss(loadingToast);
      if (error) {
        toast.error('Error al cancelar. Restaurando...');
        setAllReservas(originalReservas);
      } else {
        toast.success('Reserva cancelada.');
      }
    }
  }, [user, allReservas, supabase]);

  const handleCustomReservation = useCallback(async () => {
    if (!user || !customTime || !selectedTurno) {
      toast.error('Por favor completa la hora de inicio');
      return;
    }

    // Validar que no exceda el límite de minutos
    if (minutesReserved + customDuration > MAX_MINUTES) {
      toast.error(`Solo puedes reservar ${MAX_MINUTES - minutesReserved} minutos más`);
      return;
    }

    // Crear fecha y hora de inicio
    const { start: turnoStart } = getTurnoDateRange(selectedTurno);
    const [hours, minutes] = customTime.split(':').map(Number);
    const startTime = new Date(turnoStart);
    startTime.setHours(hours, minutes, 0, 0);
    
    // Calcular hora de fin
    const endTime = new Date(startTime.getTime() + customDuration * 60000);

    // Validar que esté dentro del turno
    const { start, end } = getTurnoDateRange(selectedTurno);
    if (startTime < start || endTime > end) {
      toast.error(`El horario debe estar dentro del turno ${selectedTurno.label}`);
      return;
    }

    // Verificar conflictos con reservas existentes
    const hasConflict = filteredReservas.some(r => {
      const existingStart = new Date(r.start_time).getTime();
      const existingEnd = new Date(r.end_time).getTime();
      const newStart = startTime.getTime();
      const newEnd = endTime.getTime();
      
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (hasConflict) {
      toast.error('Este horario se solapa con otra reserva existente');
      return;
    }

    const loadingToast = toast.loading('Creando reserva personalizada...');
    
    const newReserva = {
      user_id: user.isGuest ? null : user.id,
      user_name: user.name,
      shift: selectedTurno.label,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: customDuration
    };

    const { data, error } = await supabase.from('reservas').insert([newReserva]).select();
    toast.dismiss(loadingToast);
    
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success(`¡Reserva creada para las ${customTime}!`);
      if (data) {
        setAllReservas(current => [...current, ...data]);
      }
      setCustomTime('');
      setCustomDuration(10);
    }
  }, [user, customTime, customDuration, selectedTurno, minutesReserved, filteredReservas, supabase]);
  
  const handleLogout = async () => {
    if (user && !user.isGuest) await supabase.auth.signOut();
    localStorage.removeItem('guestUser');
    toast.success('¡Hasta luego!');
    router.push('/auth/login');
  };



  if (!user) return <div className="flex h-screen items-center justify-center bg-bg-primary text-text-primary font-sora text-lg">Cargando...</div>;

  return (
    <div className="bg-bg-primary min-h-screen font-sora">
      <header className="bg-bg-secondary shadow-sm sticky top-0 z-10 border-b border-border-default">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-text-primary">Planificador de Descansos</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary hidden sm:block">
                Hola, <strong className="font-semibold text-text-primary">{user.name}</strong>
              </span>
              <button
                onClick={() => router.push('/profile')}
                className="px-3 py-1.5 text-sm font-semibold border border-border-default rounded-md hover:bg-border-default transition-colors"
              >
                Mi Perfil
              </button>
              <button onClick={handleLogout} className="px-3 py-1.5 text-sm font-semibold border border-border-default rounded-md hover:bg-error/20 text-error transition-colors">
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <section className="p-6 bg-bg-secondary rounded-xl shadow-lg border border-border-default">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">1. Elige tu turno</h2>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Tiempo restante:</p>
              <p className="text-lg font-bold text-primary">{MAX_MINUTES - minutesReserved} minutos</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {TURNOS.map(turno => {
              const isTurnoActivo = turno.id === activeTurno.id;
              return (
                <button key={turno.id} 
                  onClick={() => setSelectedTurno(turno)}
                  disabled={!isTurnoActivo}
                  className={`px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all duration-200 ${
                    selectedTurno?.id === turno.id 
                    ? 'bg-primary text-on-primary scale-105' 
                    : isTurnoActivo 
                      ? 'bg-bg-primary hover:bg-border-default'
                      : 'bg-bg-primary opacity-40 cursor-not-allowed'
                  }`}>
                  {turno.label}
                </button>
              );
            })}
          </div>
        </section>

        {selectedTurno && selectedTurno.id !== activeTurno.id && (
          <div className="text-center py-6 bg-bg-secondary rounded-xl border border-border-default">
            <p className="font-semibold text-accent">¡Para los impacientes!</p>
            <p className="text-text-secondary">Este turno aún no ha comenzado. El turno activo es el de <span className="text-text-primary font-semibold">{activeTurno.label}</span>.</p>
          </div>
        )}

        {/* Horario Personalizado */}
        {selectedTurno && canReserveMore && (
          <section className="p-6 bg-bg-secondary rounded-xl shadow-lg border border-border-default">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">2. Crear Horario Personalizado</h2>
              <div className="text-accent text-sm font-medium flex items-center gap-2">
                <TargetIcon className="w-4 h-4" />
                ¡Elige cualquier hora que quieras!
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Hora de inicio */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Hora de inicio
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Duración */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Duración (minutos disponibles: {MAX_MINUTES - minutesReserved})
                </label>
                <select
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-bg-primary border border-border-default rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {[5, 10, 15, 20, 25, 30].filter(min => min <= (MAX_MINUTES - minutesReserved)).map(min => (
                    <option key={min} value={min}>{min} minutos</option>
                  ))}
                </select>
              </div>

              {/* Botón crear */}
              <div className="flex items-end">
                <button
                  onClick={handleCustomReservation}
                  disabled={!customTime}
                  className="w-full px-6 py-2 bg-accent text-on-primary font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Crear Reserva
                </button>
              </div>
            </div>

            <div className="text-sm text-text-secondary">
              <p className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                <strong>Ejemplo:</strong> Si quieres salir a las 21:00 por 15 minutos, simplemente selecciona &quot;21:00&quot; y &quot;15 minutos&quot;.
              </p>
              <p className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Tu reserva será para el turno: <strong>{selectedTurno.label}</strong>
              </p>
            </div>
          </section>
        )}

        {/* Timeline de Reservas */}
        {selectedTurno && (
          <section className="p-6 bg-bg-secondary rounded-xl shadow-lg border border-border-default">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">3. Timeline de Descansos - {selectedTurno.label}</h2>
              {!canReserveMore && (
                <div className="text-center py-2 px-4 bg-success/20 rounded-lg border border-success/50">
                  <p className="text-sm font-semibold text-success flex items-center gap-2 justify-center">
                    <PlusIcon className="w-4 h-4" />
                    Límite alcanzado ({minutesReserved}/{MAX_MINUTES} min)
                  </p>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-text-secondary flex items-center justify-center gap-2">
                  <ReloadIcon className="w-4 h-4 animate-spin" />
                  Cargando reservas...
                </div>
              </div>
            ) : filteredReservas.length === 0 ? (
              <div className="text-center py-12 bg-bg-primary rounded-xl border border-border-subtle">
                <div className="text-6xl mb-4">
                  <ClockIcon className="w-16 h-16 mx-auto text-text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-text-primary mb-2">No hay reservas aún</h3>
                <p className="text-text-secondary">¡Sé el primero en reservar tu descanso para este turno!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Timeline agrupado por horas */}
                {Object.entries(groupReservasByHour(filteredReservas)).map(([hourLabel, reservasInHour]) => (
                  <div key={hourLabel} className="space-y-4">
                    {/* Separador de hora */}
                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-accent text-on-primary font-bold rounded-full flex items-center justify-center text-sm">
                        <ClockIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-grow h-0.5 bg-border-default relative">
                        <div className="absolute -top-2 left-4 bg-bg-secondary px-2 py-1 text-sm font-semibold text-accent">
                          {hourLabel}
                        </div>
                      </div>
                    </div>
                    
                    {/* Reservas de esta hora */}
                    <div className="relative ml-4">
                      {/* Línea vertical para conectar las reservas de esta hora */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-subtle"></div>
                      
                      {reservasInHour.map((reserva, index) => {
                      const startTime = new Date(reserva.start_time);
                      const endTime = new Date(reserva.end_time);
                      const isMyReservation = user.isGuest ? reserva.user_name === user.name : reserva.user_id === user.id;
                      
                      return (
                        <motion.div
                          key={reserva.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex items-center gap-4 pb-6"
                        >
                          {/* Punto del timeline */}
                          <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 ${
                            isMyReservation 
                              ? 'bg-primary border-primary' 
                              : 'bg-bg-secondary border-border-default'
                          }`}></div>
                          
                          {/* Tarjeta de reserva */}
                          <div className={`flex-1 p-4 rounded-lg border transition-all hover:shadow-md ${
                            isMyReservation
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-bg-primary border-border-subtle'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="text-lg font-bold font-mono">
                                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                  </span>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    isMyReservation
                                      ? 'bg-primary text-on-primary'
                                      : 'bg-text-secondary/10 text-text-secondary'
                                  }`}>
                                    {reserva.duration_minutes} min
                                  </span>
                                </div>
                                
                                <p className={`font-medium flex items-center gap-2 ${isMyReservation ? 'text-primary' : 'text-text-primary'}`}>
                                  <PersonIcon className="w-4 h-4" />
                                  {isMyReservation ? 'Tu descanso' : reserva.user_name}
                                </p>
                              </div>
                              
                              {/* Botón de eliminar solo para mis reservas */}
                              {isMyReservation && !user.isGuest && (
                                <button
                                  onClick={() => handleDeleteReservation(reserva.id)}
                                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                                  title="Cancelar reserva"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            
                            {/* Indicador visual de tiempo transcurrido */}
                            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
                              <CalendarIcon className="w-3 h-3" />
                              <span>Inicio: {startTime.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                    </div>
                  </div>
                ))}

                {/* Resumen del día */}
                <div className="mt-6 p-4 bg-bg-primary rounded-lg border border-border-subtle">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      Resumen del turno:
                    </span>
                    <div className="flex gap-6">
                      <span className="text-text-primary">
                        <strong>{filteredReservas.length}</strong> reservas totales
                      </span>
                      <span className="text-primary">
                        <strong>{filteredReservas.reduce((acc, r) => acc + r.duration_minutes, 0)}</strong> min ocupados
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}