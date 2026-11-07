import { useCallback, useEffect, useRef, useState } from 'react'
import { contactoService } from '../services/contactoService'

const PAGE_LIMIT = 10

/**
 * Gestiona el directorio de contactos con scroll infinito por cursor (/agenda/contactos/cursor),
 * búsqueda con debounce estricto de 300ms (/agenda/contactos/nombre, capturando 404 -> [])
 * y alta de nuevos contactos (POST /agenda/contactos).
 */
export function useInfiniteContacts() {
  const [contacts, setContacts] = useState([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const cursorRef = useRef(0)
  const hasMoreRef = useRef(true)
  const fetchingRef = useRef(false)

  const fetchCursorBatch = useCallback(async (reset = false) => {
    if (fetchingRef.current) return
    if (!reset && !hasMoreRef.current) return

    fetchingRef.current = true
    setLoading(true)

    const cursorId = reset ? 0 : cursorRef.current

    try {
      const data = await contactoService.obtenerPorCursor({
        id: cursorId,
        limit: PAGE_LIMIT,
      })
      const list = Array.isArray(data) ? data : []

      setContacts((prev) => {
        const base = reset ? [] : prev
        const seen = new Set(base.map((c) => c.id))
        const next = list.filter((c) => !seen.has(c.id))
        return [...base, ...next]
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
    fetchCursorBatch(true)
  }, [fetchCursorBatch])

  // Debounce estricto de 300ms para GET /agenda/contactos/nombre?nombre={query}
  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setSearchResults(null)
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await contactoService.buscarPorNombre(trimmed)
        setSearchResults(Array.isArray(res) ? res : [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadMoreContacts = useCallback(() => {
    if (!searchQuery.trim() && !fetchingRef.current && hasMoreRef.current) {
      fetchCursorBatch(false)
    }
  }, [fetchCursorBatch, searchQuery])

  const refreshContacts = useCallback(() => {
    cursorRef.current = 0
    hasMoreRef.current = true
    setHasMore(true)
    fetchCursorBatch(true)
  }, [fetchCursorBatch])

  const displayedContacts = searchQuery.trim() ? (searchResults ?? []) : contacts

  return {
    contacts: displayedContacts,
    totalLoadedCount: contacts.length,
    hasMore: searchQuery.trim() ? false : hasMore,
    loading: searchQuery.trim() ? searching : loading,
    searchQuery,
    setSearchQuery,
    loadMoreContacts,
    refreshContacts,
  }
}
