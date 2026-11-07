import { useEffect, useState } from 'react'
import { contactoService } from '../../contacts/services/contactoService'

/**
 * Buscador asíncrono de contactos con debounce estricto de 300ms (setTimeout + clearTimeout).
 * Solo lanza petición cuando texto.trim().length > 0 para evitar 400 Bad Request,
 * y captura silenciosamente el 404 NOT_FOUND devolviendo [].
 */
export function useContactSearchDebounce(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = String(query || '').trim()
    if (trimmed.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await contactoService.buscarPorNombre(trimmed)
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [query])

  return { results, loading }
}
