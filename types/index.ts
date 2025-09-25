export interface User {
  id: string
  email: string
  name?: string
}

export interface Reservation {
  id: string
  userId: string
  date: string
  time: string
  status: 'pending' | 'confirmed' | 'cancelled'
}

export interface ReservaFlexible {
  id: string
  user_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  duracion_minutos: number
  estado: 'activa' | 'completada' | 'cancelada'
  notas?: string
  created_at: string
  updated_at: string
}