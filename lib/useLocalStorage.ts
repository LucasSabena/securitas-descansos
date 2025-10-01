'use client'
import { useState, useEffect } from 'react'

/**
 * Hook personalizado para manejar localStorage de forma segura
 * Compatible con iOS Safari y modo privado
 * Evita errores de hidratación en Next.js
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Estado para almacenar el valor
  // Inicializa con initialValue (no con localStorage) para evitar problemas de hidratación
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const [isLoading, setIsLoading] = useState(true)

  // Cargar el valor desde localStorage solo en el cliente después del montaje
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    try {
      // Intentar obtener del localStorage
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      // Safari en modo privado puede lanzar excepciones
      console.warn(`Error leyendo localStorage key "${key}":`, error)
    } finally {
      setIsLoading(false)
    }
  }, [key])

  // Función para guardar valor
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Permitir que value sea una función para tener la misma API que useState
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      // Guardar estado
      setStoredValue(valueToStore)
      
      // Guardar en localStorage si está disponible
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      // Safari en modo privado puede fallar al escribir
      console.warn(`Error guardando en localStorage key "${key}":`, error)
    }
  }

  // Función para eliminar valor
  const removeValue = () => {
    try {
      setStoredValue(initialValue)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn(`Error eliminando localStorage key "${key}":`, error)
    }
  }

  return { value: storedValue, setValue, removeValue, isLoading }
}
