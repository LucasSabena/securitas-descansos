'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

type UserProfile = { id: string; name: string; isGuest: boolean; }
type Turno = { id: string; label: string; startHour: number; endHour: number; }
type Reserva = { id: string; start_time: string; end_time: string; user_id: string; user_name: string; duration_minutes: number; }

const TURNOS: Turno[] = [
  { id: 'manana', label: '06:45 - 14:45', startHour: 6, endHour: 15 },
  { id: 'tarde', label: '14:45 - 23:45', startHour: 14, endHour: 24 },
  { id: 'noche', label: '23:45 - 06:45', startHour: 23, endHour: 31 },
];
const SLOT_DURATION = 10;
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

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [allReservas, setAllReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(getCurrentActiveTurno);
  const [timeSlots, setTimeSlots] = useState<Date[]>([])
  const [selectedSlots, setSelectedSlots] = useState<Date[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())

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

  useEffect(() => {
    if (!selectedTurno) return;
    const { start: turnoStart } = getTurnoDateRange(selectedTurno);
    const slots: Date[] = [];
    let currentTime = turnoStart.getTime();
    const endTime = currentTime + (9 * 60 * 60 * 1000); // 9 hours in milliseconds

    while (currentTime < endTime) {
      slots.push(new Date(currentTime));
      currentTime += SLOT_DURATION * 60 * 1000; // Add SLOT_DURATION minutes in milliseconds
    }
    setTimeSlots(slots);
    setSelectedSlots([]);
  }, [selectedTurno]);

  const handleSlotClick = useCallback((slot: Date) => {
    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.getTime() === slot.getTime());
      if (isSelected) {
        return prev.filter(s => s.getTime() !== slot.getTime());
      }
      const minutesToReserve = (prev.length + 1) * SLOT_DURATION;
      if (minutesReserved + minutesToReserve > MAX_MINUTES) {
        toast.error(`No puedes reservar más de ${MAX_MINUTES} minutos en total.`);
        return prev;
      }
      return [...prev, slot].sort((a,b) => a.getTime() - b.getTime());
    });
  }, [minutesReserved]);

  const handleConfirmReservation = async () => {
    if (!user || selectedSlots.length === 0 || !selectedTurno) return;
    const loadingToast = toast.loading('Confirmando reserva...');
    const sortedSlots = selectedSlots.sort((a, b) => a.getTime() - b.getTime());
    const reservationBlocks: { start: Date; end: Date; duration: number }[] = [];
    if (sortedSlots.length > 0) {
      let currentBlock = { start: sortedSlots[0], end: new Date(sortedSlots[0].getTime() + SLOT_DURATION * 60000), duration: SLOT_DURATION };
      for (let i = 1; i < sortedSlots.length; i++) {
        const previousSlotEnd = new Date(sortedSlots[i-1].getTime() + SLOT_DURATION * 60000);
        if (sortedSlots[i].getTime() === previousSlotEnd.getTime()) {
          currentBlock.end = new Date(sortedSlots[i].getTime() + SLOT_DURATION * 60000);
          currentBlock.duration += SLOT_DURATION;
        } else {
          reservationBlocks.push(currentBlock);
          currentBlock = { start: sortedSlots[i], end: new Date(sortedSlots[i].getTime() + SLOT_DURATION * 60000), duration: SLOT_DURATION };
        }
      }
      reservationBlocks.push(currentBlock);
    }
    const newReservas = reservationBlocks.map(block => ({ user_id: user.isGuest ? null : user.id, user_name: user.name, shift: selectedTurno.label, start_time: block.start.toISOString(), end_time: block.end.toISOString(), duration_minutes: block.duration }));
    const { data, error } = await supabase.from('reservas').insert(newReservas).select();
    toast.dismiss(loadingToast);
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      toast.success('¡Descanso reservado!');
      if (data) {
        setAllReservas(currentReservas => [...currentReservas, ...data]);
      }
      setSelectedSlots([]);
    }
  };

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
  
  const handleLogout = async () => {
    if (user && !user.isGuest) await supabase.auth.signOut();
    localStorage.removeItem('guestUser');
    toast.success('¡Hasta luego!');
    router.push('/auth/login');
  };

  const renderedSlots = useMemo(() => {
    return (
      <AnimatePresence>
        {timeSlots.map(slot => {
            const slotTime = slot.getTime();
            const reservedBy = filteredReservas.find(r => slotTime >= new Date(r.start_time).getTime() && slotTime < new Date(r.end_time).getTime());
            const isSelected = selectedSlots.some(s => s.getTime() === slotTime);
            const isMyReservation = reservedBy ? (user?.isGuest ? reservedBy.user_name === user.name : reservedBy.user_id === user?.id) : false;
            const isDisabled = (!!reservedBy && !isMyReservation) || (!isSelected && !canReserveMore);

            let slotClass = "bg-dark-background-secondary border-dark-border-default/50 hover:border-dark-primary";
            if (isMyReservation) slotClass = "bg-dark-primary/80 border-dark-primary text-white font-semibold";
            else if (reservedBy) slotClass = "bg-dark-border-default text-dark-text-secondary cursor-not-allowed";
            else if (isSelected) slotClass = "bg-dark-accent border-dark-accent text-dark-text-on-primary ring-2 ring-dark-accent font-semibold";
            else if (!canReserveMore) slotClass = "bg-dark-background-secondary border-dark-border-default/50 opacity-50 cursor-not-allowed";

            return (
              <motion.div key={slotTime} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="relative">
                <button disabled={isDisabled} onClick={() => handleSlotClick(slot)} className={`w-full h-full p-2 rounded-lg text-center border transition-all duration-150 ${slotClass}`}>
                    <p className="font-mono text-lg">{slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                    {reservedBy && <p className="text-xs truncate">{isMyReservation ? "Tu Descanso" : reservedBy.user_name}</p>}
                </button>
                {isMyReservation && !user?.isGuest && reservedBy && (
                  <button onClick={() => handleDeleteReservation(reservedBy.id)} className="absolute -top-2 -right-2 bg-dark-error text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 active:scale-95">
                    X
                  </button>
                )}
              </motion.div>
            );
        })}
      </AnimatePresence>
    );
  }, [timeSlots, filteredReservas, selectedSlots, user, canReserveMore, handleSlotClick, handleDeleteReservation]);

  if (!user) return <div className="flex h-screen items-center justify-center bg-dark-background-primary text-dark-text-primary font-sora text-lg">Cargando...</div>;
  
  return (
    <div className="bg-dark-background-primary min-h-screen font-sora">
      <header className="bg-dark-background-secondary shadow-sm sticky top-0 z-10 border-b border-dark-border-default">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-dark-text-primary">Planificador de Descansos</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-dark-text-secondary hidden sm:block">
                Hola, <strong className="font-semibold text-dark-text-primary">{user.name}</strong>
              </span>
              <button
                onClick={() => router.push('/profile')}
                className="px-3 py-1.5 text-sm font-semibold border border-dark-border-default rounded-md hover:bg-dark-border-default transition-colors"
              >
                Mi Perfil
              </button>
              <button onClick={handleLogout} className="px-3 py-1.5 text-sm font-semibold border border-dark-border-default rounded-md hover:bg-dark-error/20 text-dark-error transition-colors">
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <section className="p-6 bg-dark-background-secondary rounded-xl shadow-lg border border-dark-border-default">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">1. Elige tu turno</h2>
            <div className="text-right">
              <p className="text-sm text-dark-text-secondary">Tiempo restante:</p>
              <p className="text-lg font-bold text-dark-primary">{MAX_MINUTES - minutesReserved} minutos</p>
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
                    ? 'bg-dark-primary text-white scale-105' 
                    : isTurnoActivo 
                      ? 'bg-dark-background-primary hover:bg-dark-border-default'
                      : 'bg-dark-background-primary opacity-40 cursor-not-allowed'
                  }`}>
                  {turno.label}
                </button>
              );
            })}
          </div>
        </section>

        {selectedTurno && selectedTurno.id !== activeTurno.id && (
          <div className="text-center py-6 bg-dark-background-secondary rounded-xl border border-dark-border-default">
            <p className="font-semibold text-dark-accent">¡Para los impacientes!</p>
            <p className="text-dark-text-secondary">Este turno aún no ha comenzado. El turno activo es el de <span className="text-dark-text-primary font-semibold">{activeTurno.label}</span>.</p>
          </div>
        )}

        {selectedTurno && (
          <section className="p-6 bg-dark-background-secondary rounded-xl shadow-lg border border-dark-border-default">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <h2 className="text-xl font-bold">2. Selecciona tus horarios</h2>
              {selectedSlots.length > 0 && (
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold">{selectedSlots.length * SLOT_DURATION} mins a reservar</span>
                  <button onClick={handleConfirmReservation} className="px-6 py-2 bg-dark-success text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity">
                    Confirmar
                  </button>
                </div>
              )}
            </div>
            {!canReserveMore && minutesReserved > 0 && (
              <div className="text-center py-4 mb-4 bg-dark-success/20 rounded-lg border border-dark-success/50">
                <p className="font-semibold text-dark-success">¡Ya has reservado todo tu tiempo de descanso!</p>
              </div>
            )}
            {loading ? <p>Cargando horarios...</p> : 
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {renderedSlots}
              </div>
            }
          </section>
        )}
      </main>
    </div>
  )
}