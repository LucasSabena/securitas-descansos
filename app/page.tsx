'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLocalStorage } from '@/lib/useLocalStorage'

// Tipo para el usuario invitado
type GuestUser = {
  id: string
  name: string
  isGuest: boolean
} | null

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  
  // Usar hook seguro para localStorage
  const { value: guestUser, isLoading: isLoadingGuest } = useLocalStorage<GuestUser>('guestUser', null)

  useEffect(() => {
    // No hacer nada hasta que el localStorage esté cargado
    if (isLoadingGuest) {
      return
    }

    const checkAuthAndRedirect = async () => {
      try {
        // Verificar si hay una sesión activa
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Si hay sesión, verificar si tiene perfil
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            // Tiene sesión y perfil completo → Dashboard
            router.replace('/dashboard')
          } else {
            // Tiene sesión pero no perfil → Welcome
            router.replace('/welcome')
          }
        } else {
          // Verificar si hay usuario invitado
          if (guestUser) {
            // Hay usuario invitado → Dashboard
            router.replace('/dashboard')
          } else {
            // No hay sesión ni invitado → Login
            router.replace('/auth/login')
          }
        }
      } catch (error) {
        console.error('Error en verificación de autenticación:', error)
        // En caso de error, redirigir al login como fallback
        router.replace('/auth/login')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthAndRedirect()
  }, [supabase, router, guestUser, isLoadingGuest])

  // Mostrar loading mientras verifica
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-primary text-text-primary font-sora text-lg">
      {(isLoadingGuest || isChecking) ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando sesión...</p>
        </div>
      ) : (
        <p>Redirigiendo...</p>
      )}
    </div>
  )
}