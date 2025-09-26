'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

type NotificationPermission = 'default' | 'granted' | 'denied'

interface NotificationHook {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<boolean>
  scheduleNotification: (reservaId: string, startTime: string, title: string) => void
  cancelNotification: (reservaId: string) => void
}

export function useNotifications(): NotificationHook {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Verificar soporte para notificaciones
    if (typeof window !== 'undefined') {
      setIsSupported('Notification' in window && 'serviceWorker' in navigator)
      setPermission(Notification.permission as NotificationPermission)
      
      // Registrar service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registrado:', registration)
            setServiceWorker(registration)
          })
          .catch((error) => {
            console.error('Error registrando SW:', error)
          })
      }
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Las notificaciones no son compatibles con este navegador')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermission)
      
      if (result === 'granted') {
        toast.success('¡Notificaciones activadas!')
        return true
      } else if (result === 'denied') {
        toast.error('Notificaciones bloqueadas. Puedes activarlas en configuración del navegador.')
        return false
      } else {
        toast.error('Permisos de notificación no otorgados')
        return false
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error)
      toast.error('Error al solicitar permisos de notificación')
      return false
    }
  }

  const scheduleNotification = (reservaId: string, startTime: string, title: string) => {
    if (permission !== 'granted') {
      console.log('⚠️ Sin permisos de notificación')
      return
    }

    try {
      const startDate = new Date(startTime)
      const now = new Date()
      
      // Programar notificación 5 minutos antes
      const notificationTime = new Date(startDate.getTime() - 5 * 60 * 1000)
      const delay = notificationTime.getTime() - now.getTime()
      
      console.log('🔔 Programando notificación:', {
        reservaId,
        startTime,
        notificationTime: notificationTime.toLocaleString(),
        delay: Math.round(delay / 1000 / 60) + ' minutos'
      })
      
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Máximo 24 horas
        // Usar setTimeout directo (más confiable para pruebas)
        setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification('Descanso próximo', {
              body: `Tu descanso "${title}" empezará en 5 minutos`,
              icon: '/favicon.ico',
              tag: `reminder-${reservaId}`,
              requireInteraction: true
            })
          }
        }, delay)
        
        console.log(`✅ Notificación programada para ${notificationTime.toLocaleTimeString()}`)
        toast.success(`Recordatorio programado para ${notificationTime.toLocaleTimeString()}`)
      } else if (delay <= 0) {
        console.log('⏰ Descanso muy pronto, mostrando notificación inmediata')
        if (Notification.permission === 'granted') {
          new Notification('Descanso ahora', {
            body: `Tu descanso "${title}" está empezando`,
            icon: '/favicon.ico',
            requireInteraction: true
          })
        }
      } else {
        console.log('⏳ Descanso muy lejano (>24h)')
      }
    } catch (error) {
      console.error('❌ Error programando notificación:', error)
      toast.error('Error al programar notificación')
    }
  }

  const cancelNotification = (reservaId: string) => {
    // Para notificaciones programadas localmente, no hay manera directa de cancelarlas
    // Una mejora futura sería usar una cola de trabajos más sofisticada
    console.log('Cancelando notificación para reserva:', reservaId)
  }

  return {
    permission,
    isSupported,
    requestPermission,
    scheduleNotification,
    cancelNotification
  }
}