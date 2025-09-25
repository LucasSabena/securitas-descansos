'use client'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [guestName, setGuestName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      toast.error('Error al iniciar con Google: ' + error.message)
      setLoading(false)
    }
  }

  const handleGuestLogin = () => {
    if (guestName.trim().length < 3) {
      toast.error('Por favor, ingresa un nombre de al menos 3 caracteres.')
      return
    }
    const guestUser = { id: `guest_${Date.now()}`, name: guestName.trim(), isGuest: true }
    localStorage.setItem('guestUser', JSON.stringify(guestUser))
    toast.success(`¡Bienvenido, ${guestName.trim()}!`)
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-4 font-sora">
      <div className="w-full max-w-sm p-8 space-y-6 bg-bg-secondary rounded-2xl shadow-2xl border border-border-default">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary font-sora">
            Planificador
          </h1>
          <p className="text-text-secondary mt-2">
            Accede para reservar tu descanso
          </p>
        </div>

        <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex justify-center items-center gap-3 py-3 px-4 bg-bg-primary border border-border-default rounded-lg font-semibold text-text-primary hover:bg-border-default/20 transition-colors disabled:opacity-50">
          <svg className="w-5 h-5" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.602 2.5 24 2.5C11.936 2.5 2.5 11.936 2.5 24s9.436 21.5 21.5 21.5c11.162 0 20.37-8.544 21.096-19.524c.034-.584.06-1.173.06-1.776c0-1.202-.158-2.355-.445-3.417z"></path><path fill="#FF3D00" d="M6.306 14.691c-2.344 3.463-3.806 7.63-3.806 12.191s1.462 8.728 3.806 12.191L11.71 34.09C9.525 30.56 8.5 26.54 8.5 22.5s1.025-8.06 3.21-11.59L6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-5.4-5.4c-1.921 1.306-4.286 2.092-6.909 2.092c-5.218 0-9.613-3.424-11.181-8.092l-5.4 5.4C9.645 38.983 16.257 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083L43.596 20L42 20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.4 5.4C41.838 35.617 44 30.075 44 24c0-1.776-.224-3.522-.639-5.188l.25-1.729z"></path>
          </svg>
          Continuar con Google
        </button>

        <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-border-default"></div><span className="flex-shrink mx-4 text-xs text-text-secondary uppercase">O como Invitado</span><div className="flex-grow border-t border-border-default"></div></div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="guestName" className="text-sm font-medium text-text-secondary">Tu Nombre (será permanente)</label>
            <input id="guestName" name="guestName" type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} required placeholder="Ej: Juan Pérez" className="mt-1 w-full px-3 py-2 border border-border-default rounded-md bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-primary text-text-primary"/>
          </div>
          <button onClick={handleGuestLogin} className="w-full py-3 px-4 bg-primary text-on-primary font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
            Entrar como Invitado
          </button>
        </div>
      </div>
    </div>
  )
}