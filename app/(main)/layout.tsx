'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation' // <-- Importamos usePathname

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname() // <-- Hook para saber la ruta actual
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // Primero verificamos la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      // CASO 1: NO hay sesión de Supabase
      if (!session) {
        // Verificar localStorage de forma segura
        let guestData = null
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const data = window.localStorage.getItem('guestUser')
            guestData = data ? JSON.parse(data) : null
          }
        } catch (error) {
          console.warn('Error accediendo a localStorage:', error)
        }

        if (!guestData) {
          // Si no hay ni sesión ni invitado, lo llevamos al login
          router.push('/auth/login');
          return;
        }
        // Si hay datos de invitado, permitimos continuar
        setIsLoading(false);
        return;
      }

      // CASO 2: SÍ hay sesión de Supabase
      if (session) {
        // Verificamos si tiene un perfil creado
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        // Si no tiene perfil Y NO estamos ya en /welcome, redirigimos
        if (!profile && pathname !== '/welcome') {
          router.replace('/welcome');
          return;
        }
        
        // Si tiene perfil, todo está bien, permitir continuar
        setIsLoading(false);
        return;
      }
    };

    // Ejecutar verificación inicial
    checkAuth();

    // También escuchar cambios de autenticación para actualizaciones en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      // Solo reaccionar a eventos de sign in/out, no a cada cambio
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkAuth();
      }
    });

    // Función de limpieza para la suscripción
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, pathname]);

  // Mientras se verifica todo, mostramos una pantalla de carga.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-dark-background-primary text-dark-text-primary font-sora text-lg">
        Verificando sesión...
      </div>
    );
  }

  // Si la verificación fue exitosa, mostramos la página hija (dashboard, profile, etc.)
  return <>{children}</>;
}