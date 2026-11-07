import { useCallback, useState } from 'react'
import { tareaService } from '../services/tareaService'

export function useCreateTaskOrRoutine() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const createTaskOrRoutine = useCallback(async (tareaPostDto) => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await tareaService.crearTareaORutina(tareaPostDto)
      return created
    } catch (err) {
      const msg = err?.mensaje || err?.message || 'No se pudo guardar la actividad.'
      setError(msg)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [])

  return {
    createTaskOrRoutine,
    submitting,
    error,
    clearError: () => setError(null),
  }
}
