import { useCallback, useState } from 'react'
import { eventoService } from '../services/eventoService'

export function useCreateEvent() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const createEvent = useCallback(async (eventoPostDto) => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await eventoService.crearEvento(eventoPostDto)
      return created
    } catch (err) {
      const msg = err?.mensaje || err?.message || 'No se pudo crear el evento.'
      setError(msg)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [])

  const updateEvent = useCallback(async (id, eventoPostDto) => {
    setSubmitting(true)
    setError(null)
    try {
      const updated = await eventoService.actualizarEvento(id, eventoPostDto)
      return updated
    } catch (err) {
      const msg = err?.mensaje || err?.message || 'No se pudo actualizar el evento.'
      setError(msg)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [])

  return {
    createEvent,
    updateEvent,
    submitting,
    error,
    clearError: () => setError(null),
  }
}
