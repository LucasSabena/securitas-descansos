'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
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
        const guestData = localStorage.getItem('guestUser')
        if (guestData) {
          // Hay usuario invitado → Dashboard
          router.replace('/dashboard')
        } else {
          // No hay sesión ni invitado → Login
          router.replace('/auth/login')
        }
      }
    }

    checkAuthAndRedirect()
  }, [supabase, router])

  // Mostrar loading mientras verifica
  return (
    <div className="flex h-screen w-full items-center justify-center bg-bg-primary text-text-primary font-sora text-lg">
      Redirigiendo...
    </div>
  )
}