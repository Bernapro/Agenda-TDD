import { useEffect, useRef, useState } from 'react'
import { etiquetaService } from '../services/etiquetaService'
import { adaptTag } from '../utils/tagUtils'

const TAG_SEARCH_DEBOUNCE_MS = 350

/**
 * Buscador asíncrono de etiquetas con debounce estricto de 350ms (setTimeout + clearTimeout).
 * - Si query.trim() está vacío no dispara petición y devuelve results = [] y loading = false.
 * - Cancela la petición anterior (AbortController) cuando el usuario sigue escribiendo.
 * - Normaliza cada etiqueta a { id, nombre: '#Etiqueta', label: 'Etiqueta', hexColor: '#RRGGBB' }.
 */
export function useTagSearchDebounce(query, availableTags = []) {
  const trimmed = String(query || '').trim()
  const [resolved, setResolved] = useState({ query: '', results: [] })

  // Ref para no reiniciar el debounce cuando cambia la identidad del arreglo de etiquetas
  const availableTagsRef = useRef(availableTags)
  useEffect(() => {
    availableTagsRef.current = availableTags
  }, [availableTags])

  useEffect(() => {
    if (!trimmed) return undefined

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const data = await etiquetaService.buscarPorNombre(trimmed, {
          availableTags: availableTagsRef.current,
          signal: controller.signal,
        })
        const list = (Array.isArray(data) ? data : []).map((t) => adaptTag(t)).filter(Boolean)
        setResolved({ query: trimmed, results: list })
      } catch (err) {
        if (err?.name === 'AbortError') return
        setResolved({ query: trimmed, results: [] })
      }
    }, TAG_SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  const loading = trimmed.length > 0 && resolved.query !== trimmed
  const results = trimmed.length > 0 ? resolved.results : []

  return { results, loading }
}
