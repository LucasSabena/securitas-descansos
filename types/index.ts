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