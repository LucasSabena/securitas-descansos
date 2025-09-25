'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type UserProfile = { id: string; name: string; isGuest: boolean; }
type Reserva = { start_time: string; duration_minutes: number; }
type Stats = {
  totalReservas: number;
  totalMinutos: number;
  promedioMinutos: number;
  horarioFavorito: string;
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

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
        <div className="p-6 bg-dark-background-secondary rounded-xl shadow-lg border border-dark-border-default">
          <h2 className="text-2xl font-bold text-dark-text-primary mb-6">Hola, {user?.name}</h2>
          
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