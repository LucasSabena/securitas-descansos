'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import toast from 'react-hot-toast'

export default function WelcomePage() {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/auth/login')
      else {
        setUser(session.user)
        setDisplayName(session.user.user_metadata.full_name || '')
      }
    }
    getUser()
  }, [supabase, router])

  const handleSaveProfile = async () => {
    if (displayName.trim().length < 3) {
      toast.error('Tu nombre debe tener al menos 3 caracteres.')
      return
    }
    if (!user) return
    setLoading(true)
    const { error } = await supabase.from('profiles').insert({ id: user.id, display_name: displayName.trim() })
    if (error) {
      toast.error('Hubo un error al guardar tu nombre.')
      // console.error(error) // Comentado para producción
    } else {
      toast.success('¡Perfil creado con éxito!')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-background-secondary p-4 font-sora">
      <div className="w-full max-w-md p-8 space-y-6 bg-dark-background-primary rounded-2xl shadow-2xl border border-dark-border-default">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-dark-primary">¡Bienvenido!</h1>
          <p className="text-dark-text-secondary mt-2">Solo un último paso. Elige el nombre que verán tus compañeros.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="displayName" className="text-sm font-medium text-dark-text-secondary">Tu Nombre de Operador</label>
            <input id="displayName" name="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="Ej: Juan Pérez" className="mt-1 w-full px-3 py-2 border border-dark-border-default rounded-md bg-dark-background-secondary focus:outline-none focus:ring-2 focus:ring-dark-primary"/>
            <p className="mt-2 text-xs text-dark-text-secondary/80">⚠️ **Importante:** Una vez guardado, este nombre no se podrá cambiar.</p>
          </div>
          <button onClick={handleSaveProfile} disabled={loading} className="w-full py-3 px-4 bg-dark-success text-white font-semibold rounded-lg shadow-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-success transition-colors disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar y Continuar'}
          </button>
        </div>
      </div>
    </div>
  )
}