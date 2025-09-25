'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  CalendarIcon, 
  ClockIcon, 
  ReloadIcon
} from '@radix-ui/react-icons'

type UserProfile = { id: string; name: string; isGuest: boolean; }
type Stats = {
  totalReservas: number;
  totalMinutos: number;
  promedioMinutos: number;
  horarioFavorito: string;
}
type Reserva = { 
  id: string; 
  start_time: string; 
  end_time: string; 
  user_id: string; 
  user_name: string; 
  duration_minutes: number;
  shift?: string;
}
type DayHistory = {
  fecha: string;
  reservas: Reserva[];
  totalMinutos: number;
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stats' | 'history'>('stats')
  const [historial, setHistorial] = useState<DayHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const guestData = localStorage.getItem('guestUser');
        if (guestData) {
          setUser(JSON.parse(guestData));
          setLoading(false);
        } else {
          router.push('/auth/login');
        }
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', session.user.id).single();
      if (!profile) {
        router.push('/welcome');
        return;
      }
      
      const currentUser = { id: session.user.id, name: profile.display_name, isGuest: false };
      setUser(currentUser);
      
      const { data: reservas, error } = await supabase.from('reservas').select('start_time, duration_minutes').eq('user_id', currentUser.id);
      
      if (reservas && !error) {
        const totalReservas = reservas.length;
        const totalMinutos = reservas.reduce((acc, r) => acc + r.duration_minutes, 0);
        const promedioMinutos = totalReservas > 0 ? Math.round(totalMinutos / totalReservas) : 0;
        
        const horas = reservas.map(r => new Date(r.start_time).getHours());
        const conteoHoras: { [key: number]: number } = {};
        horas.forEach(h => conteoHoras[h] = (conteoHoras[h] || 0) + 1);
        const horarioFavorito = totalReservas > 0 ? Object.keys(conteoHoras).reduce((a, b) => conteoHoras[Number(a)] > conteoHoras[Number(b)] ? a : b) + ":00hs" : "N/A";
        
        setStats({ totalReservas, totalMinutos, promedioMinutos, horarioFavorito });
      }
      setLoading(false);
    };

    fetchProfileAndStats();
  }, [supabase, router]);

  const fetchHistorial = async () => {
    if (!user) return;
    setLoadingHistory(true);

    // Obtener reservas de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reservas, error } = await supabase
      .from('reservas')
      .select('*')
      .eq(user.isGuest ? 'user_name' : 'user_id', user.isGuest ? user.name : user.id)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      toast.error('Error al cargar historial');
    } else if (reservas) {
      // Agrupar por día
      const groupedByDay: { [key: string]: Reserva[] } = {};
      reservas.forEach(reserva => {
        const fecha = new Date(reserva.start_time).toLocaleDateString('es-ES');
        if (!groupedByDay[fecha]) {
          groupedByDay[fecha] = [];
        }
        groupedByDay[fecha].push(reserva);
      });

      // Convertir a array y calcular totales
      const historialArray: DayHistory[] = Object.entries(groupedByDay).map(([fecha, reservas]) => ({
        fecha,
        reservas,
        totalMinutos: reservas.reduce((acc, r) => acc + r.duration_minutes, 0)
      }));

      setHistorial(historialArray);
    }
    setLoadingHistory(false);
  };

  const repeatDay = async (dayHistory: DayHistory) => {
    if (!user || dayHistory.reservas.length === 0) return;

    const confirmRepeat = confirm(`¿Repetir los descansos del ${dayHistory.fecha}? Se crearán ${dayHistory.reservas.length} reserva(s) para hoy.`);
    if (!confirmRepeat) return;

    const loadingToast = toast.loading('Repitiendo reservas del día...');
    let successCount = 0;
    let errorCount = 0;

    for (const reserva of dayHistory.reservas) {
      try {
        // Convertir hora del día seleccionado a hoy
        const originalStart = new Date(reserva.start_time);
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
          originalStart.getHours(), originalStart.getMinutes(), 0, 0);
        const todayEnd = new Date(todayStart.getTime() + reserva.duration_minutes * 60000);

        const newReserva = {
          user_id: user.isGuest ? null : user.id,
          user_name: user.name,
          shift: reserva.shift || 'Manual',
          start_time: todayStart.toISOString(),
          end_time: todayEnd.toISOString(),
          duration_minutes: reserva.duration_minutes
        };

        const { error } = await supabase.from('reservas').insert([newReserva]);
        
        if (error) {
          errorCount++;
          console.error('Error creating repeated reservation:', error);
        } else {
          successCount++;
        }
      } catch (error) {
        errorCount++;
        console.error('Error processing reservation:', error);
      }
    }

    toast.dismiss(loadingToast);
    
    if (successCount > 0 && errorCount === 0) {
      toast.success(`¡${successCount} reserva(s) repetida(s) exitosamente!`);
      router.push('/dashboard'); // Redirigir al dashboard para ver las reservas
    } else if (successCount > 0 && errorCount > 0) {
      toast.success(`${successCount} reserva(s) creada(s), ${errorCount} fallaron por conflictos`);
    } else {
      toast.error('No se pudieron repetir las reservas (conflictos de horario)');
    }
  };
  
  const handleLogout = async () => {
    if (user && !user.isGuest) await supabase.auth.signOut();
    localStorage.removeItem('guestUser');
    toast.success('¡Hasta luego!');
    router.push('/auth/login');
  };

  const handleDeleteAccount = async () => {
    if (!user || user.isGuest) return;
    const confirmation = prompt('Esta acción es irreversible. Escribe "BORRAR MI CUENTA" para confirmar.');
    if (confirmation === 'BORRAR MI CUENTA') {
      const loadingToast = toast.loading('Borrando tu cuenta y todos tus datos...');
      const { data: { session } } = await supabase.auth.getSession();

      if(!session) {
        toast.dismiss(loadingToast);
        toast.error("No se pudo verificar tu sesión.");
        return;
      }

      const { error } = await supabase.functions.invoke('delete-user', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      toast.dismiss(loadingToast);
      if (error) {
        toast.error('Error al borrar la cuenta: ' + error.message);
      } else {
        toast.success('Cuenta borrada con éxito.');
        router.push('/auth/login');
      }
    } else {
      toast.error('La confirmación no es correcta.');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-dark-background-primary text-dark-text-primary">Cargando perfil...</div>;
  }

  if (user?.isGuest) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-dark-background-primary p-4 text-center">
        <h1 className="text-3xl font-bold text-dark-primary mb-4">¡Hola, {user.name}!</h1>
        <p className="text-dark-text-secondary mb-8">Las estadísticas y la gestión de cuenta solo están disponibles para usuarios registrados.</p>
        <button
          onClick={() => router.push('/auth/login')}
          className="px-8 py-3 bg-dark-primary text-white font-semibold rounded-lg shadow-lg hover:opacity-90"
        >
          Crear una cuenta con Google
        </button>
      </div>
    );
  }

  return (
    <div className="bg-dark-background-primary min-h-screen font-sora">
      <header className="bg-dark-background-secondary shadow-sm border-b border-dark-border-default">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-dark-text-primary">Tu Perfil</h1>
          <button onClick={() => router.push('/dashboard')} className="text-sm font-semibold text-dark-primary hover:underline">Volver al Planificador</button>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header con nombre */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-dark-text-primary mb-2">Hola, {user?.name}</h2>
          <p className="text-dark-text-secondary">Gestiona tu perfil y revisa tu historial de descansos</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-dark-background-secondary rounded-lg p-1 border border-dark-border-default">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'stats' 
                  ? 'bg-dark-primary text-white' 
                  : 'text-dark-text-secondary hover:text-dark-text-primary'
              }`}
            >
              📊 Estadísticas
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                if (historial.length === 0) fetchHistorial();
              }}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'history' 
                  ? 'bg-dark-primary text-white' 
                  : 'text-dark-text-secondary hover:text-dark-text-primary'
              }`}
            >
              📅 Historial
            </button>
          </div>
        </div>

        {/* Contenido según tab activo */}
        {activeTab === 'stats' && (
          <div className="p-6 bg-dark-background-secondary rounded-xl shadow-lg border border-dark-border-default">
            <h3 className="text-xl font-bold text-dark-text-primary mb-6">Estadísticas de Descansos</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              <div className="p-4 bg-dark-background-primary rounded-lg border border-dark-border-default">
                <p className="text-sm text-dark-text-secondary">Descansos Totales</p>
                <p className="text-3xl font-bold text-dark-primary">{stats?.totalReservas || 0}</p>
              </div>
              <div className="p-4 bg-dark-background-primary rounded-lg border border-dark-border-default">
                <p className="text-sm text-dark-text-secondary">Minutos Totales</p>
                <p className="text-3xl font-bold text-dark-primary">{stats?.totalMinutos || 0}</p>
              </div>
              <div className="p-4 bg-dark-background-primary rounded-lg border border-dark-border-default">
                <p className="text-sm text-dark-text-secondary">Promedio por Descanso</p>
                <p className="text-3xl font-bold text-dark-primary">{stats?.promedioMinutos || 0} min</p>
              </div>
              <div className="p-4 bg-dark-background-primary rounded-lg border border-dark-border-default">
                <p className="text-sm text-dark-text-secondary">Horario Favorito</p>
                <p className="text-3xl font-bold text-dark-primary">{stats?.horarioFavorito || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Historial Tab */}
        {activeTab === 'history' && (
          <div className="p-6 bg-dark-background-secondary rounded-xl shadow-lg border border-dark-border-default">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-dark-text-primary">Historial de Descansos (30 días)</h3>
              <button
                onClick={fetchHistorial}
                disabled={loadingHistory}
                className="px-4 py-2 bg-dark-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <ReloadIcon className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-8">
                <div className="text-dark-text-secondary flex items-center justify-center gap-2">
                  <ReloadIcon className="w-4 h-4 animate-spin" />
                  Cargando historial...
                </div>
              </div>
            ) : historial.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 mx-auto text-dark-text-secondary mb-4" />
                <h4 className="text-lg font-semibold text-dark-text-primary mb-2">No hay historial</h4>
                <p className="text-dark-text-secondary">No se encontraron descansos en los últimos 30 días</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historial.map((day, index) => (
                  <div key={index} className="p-4 bg-dark-background-primary rounded-lg border border-dark-border-default">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-dark-text-primary flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {day.fecha}
                        </h4>
                        <p className="text-sm text-dark-text-secondary">
                          {day.reservas.length} descanso(s) • {day.totalMinutos} minutos total
                        </p>
                      </div>
                      <button
                        onClick={() => repeatDay(day)}
                        className="px-3 py-1 bg-dark-primary text-white text-sm rounded-lg hover:opacity-90 flex items-center gap-1"
                      >
                        <ReloadIcon className="w-3 h-3" />
                        Repetir
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {day.reservas.map((reserva, rIndex) => (
                        <div key={rIndex} className="flex items-center justify-between p-2 bg-dark-background-secondary rounded border border-dark-border-subtle">
                          <div className="flex items-center gap-3">
                            <ClockIcon className="w-4 h-4 text-dark-text-secondary" />
                            <span className="font-mono text-sm">
                              {new Date(reserva.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(reserva.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="px-2 py-1 bg-dark-primary/20 text-dark-primary text-xs rounded-full">
                              {reserva.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-6 bg-dark-background-secondary rounded-xl shadow-lg border border-dark-border-default">
          <h2 className="text-xl font-bold text-dark-text-primary mb-4">Gestión de Cuenta</h2>
          <div className="flex flex-wrap gap-4">
            <button onClick={handleLogout} className="px-6 py-2 border border-dark-border-default rounded-lg hover:bg-dark-border-default">Cerrar Sesión</button>
            <button onClick={handleDeleteAccount} className="px-6 py-2 bg-dark-error text-white font-bold rounded-lg hover:opacity-90">Borrar Mi Cuenta</button>
          </div>
          <p className="text-xs text-dark-text-secondary mt-4">Atención: Borrar tu cuenta es una acción permanente e irreversible. Se eliminarán tu perfil y todas tus reservas asociadas.</p>
        </div>
      </main>
    </div>
  );
}