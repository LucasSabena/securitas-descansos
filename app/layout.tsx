import type { Metadata } from 'next'
import { Sora } from 'next/font/google'
import './globals.css' // <-- ¡ESTA LÍNEA ES CRÍTICA!
import { Toaster } from 'react-hot-toast' // <-- IMPORTAMOS TOASTER

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: 'Securitas | Planificador de Descansos',
  description: 'Sistema de reserva de horarios de descanso para operadores.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${sora.className} bg-bg-primary text-text-primary antialiased font-sora`}
      >
        {/* --- COMPONENTE DE NOTIFICACIONES AÑADIDO --- */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'font-sora',
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        {children}
      </body>
    </html>
  )
}