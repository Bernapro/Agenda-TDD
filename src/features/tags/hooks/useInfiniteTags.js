import { useCallback, useEffect, useRef, useState } from 'react'
import { sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'
import { etiquetaService } from '../services/etiquetaService'

const PAGE_LIMIT = 10

export const DEFAULT_PRESET_TAGS = [
  { id: 'trabajo', nombre: '#Trabajo', label: 'Trabajo', hexColor: '#3B82F6', color: '#3B82F6' },
  { id: 'personal', nombre: '#Personal', label: 'Personal', hexColor: '#D97706', color: '#D97706' },
  { id: 'estudio', nombre: '#Estudio', label: 'Estudio', hexColor: '#0E9FB8', color: '#0E9FB8' },
  { id: 'salud', nombre: '#Salud', label: 'Salud', hexColor: '#8B5CF6', color: '#8B5CF6' },
  { id: 'proyectos', nombre: '#Proyectos', label: 'Proyectos', hexColor: '#E0607E', color: '#E0607E' },
]

function adaptEtiqueta(dto) {
  const label = stripLeadingHash(dto.nombre || dto.label || '')
  const color = sanitizeHexColor(dto.hexColor || dto.color, '#6B7280')
  return {
    id: dto.id,
    nombre: `#${label}`,
    label,
    hexColor: color,
    color,
  }
}

/**
 * Paginación keyset (scroll infinito por cursor) contra GET /agenda/etiquetas/etiquetaCursor?id={cursorId}&limit=10
 */
export function useInfiniteTags() {
  const [tags, setTags] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const cursorRef = useRef(0)
  const hasMoreRef = useRef(true)
  const fetchingRef = useRef(false)

  const fetchBatch = useCallback(async (reset = false) => {
    if (fetchingRef.current) return
    if (!reset && !hasMoreRef.current) return

    fetchingRef.current = true
    setLoading(true)

    const currentCursor = reset ? 0 : cursorRef.current

    try {
      const data = await etiquetaService.obtenerPorCursor({
        id: currentCursor,
        limit: PAGE_LIMIT,
      })
      const list = Array.isArray(data) ? data.map(adaptEtiqueta).filter((t) => t.label) : []

      setTags((prev) => {
        const base = reset ? [] : prev
        const seen = new Set(base.map((t) => t.nombre.toLowerCase()))
        const appended = list.filter((t) => !seen.has(t.nombre.toLowerCase()))
        return [...base, ...appended]
      })

      const more = list.length >= PAGE_LIMIT
      hasMoreRef.current = more
      setHasMore(more)

      if (list.length > 0) {
        cursorRef.current = list[list.length - 1].id
      }
    } catch {
      hasMoreRef.current = false
      setHasMore(false)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchBatch(true)
  }, [fetchBatch])

  const loadMoreTags = useCallback(() => {
    if (!fetchingRef.current && hasMoreRef.current) {
      fetchBatch(false)
    }
  }, [fetchBatch])

  const refreshTags = useCallback(() => {
    cursorRef.current = 0
    hasMoreRef.current = true
    setHasMore(true)
    fetchBatch(true)
  }, [fetchBatch])

  return {
    tags,
    hasMore,
    loading,
    loadMoreTags,
    refreshTags,
  }
}
