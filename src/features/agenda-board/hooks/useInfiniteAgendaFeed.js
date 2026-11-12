import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractDateKeyFromISO, extractTimeFromISO } from '../../../shared/utils/isoDateFormatter'
import { eventoService } from '../../events/services/eventoService'
import { tareaService } from '../../tasks-routines/services/tareaService'
import { calculateDateRangeISO } from '../utils/dateRangeCalculator'
import { mergeAndSortFeed } from '../utils/mergeAndSortFeed'

const PAGE_LIMIT = 10

export function useInfiniteAgendaFeed({ activeDate, range, selectedTags = [] }) {
  const pageLimit = range === 'day' ? PAGE_LIMIT : 50
  const [tareasRaw, setTareasRaw] = useState([])
  const [eventosRaw, setEventosRaw] = useState([])
  const [hasMoreTareas, setHasMoreTareas] = useState(true)
  const [hasMoreEventos, setHasMoreEventos] = useState(true)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const cursorTareaRef = useRef(0)
  const cursorEventoRef = useRef(0)
  const hasMoreTareasRef = useRef(true)
  const hasMoreEventosRef = useRef(true)
  const fetchingRef = useRef(false)

  const { fechaInicioISO, fechaFinISO } = useMemo(
    () => calculateDateRangeISO(activeDate, range),
    [activeDate, range],
  )

  const fetchInitial = useCallback(async () => {
    cursorTareaRef.current = 0
    cursorEventoRef.current = 0
    hasMoreTareasRef.current = true
    hasMoreEventosRef.current = true
    setHasMoreTareas(true)
    setHasMoreEventos(true)
    setLoadingInitial(true)
    setError(null)
    fetchingRef.current = true

    try {
      const [tareasLote, eventosLote] = await Promise.all([
        tareaService.obtenerPorCursor({
          id: 0,
          limit: pageLimit,
          fechaInicio: fechaInicioISO,
          fechaFin: fechaFinISO,
        }),
        eventoService.obtenerPorCursor({
          id: 0,
          limit: pageLimit,
          fechaInicio: fechaInicioISO,
          fechaFin: fechaFinISO,
        }),
      ])

      const safeTareas = Array.isArray(tareasLote) ? tareasLote : []
      const safeEventos = Array.isArray(eventosLote) ? eventosLote : []

      setTareasRaw(safeTareas)
      setEventosRaw(safeEventos)

      const moreT = safeTareas.length >= pageLimit
      const moreE = safeEventos.length >= pageLimit

      hasMoreTareasRef.current = moreT
      hasMoreEventosRef.current = moreE
      setHasMoreTareas(moreT)
      setHasMoreEventos(moreE)

      if (safeTareas.length > 0) {
        cursorTareaRef.current = safeTareas[safeTareas.length - 1].idActividad
      }
      if (safeEventos.length > 0) {
        cursorEventoRef.current = safeEventos[safeEventos.length - 1].idActividad
      }
    } catch (err) {
      setError(err?.mensaje || err?.message || 'Error al cargar las actividades.')
    } finally {
      setLoadingInitial(false)
      fetchingRef.current = false
    }
  }, [fechaInicioISO, fechaFinISO, pageLimit])

  useEffect(() => {
    fetchInitial()
  }, [fetchInitial])

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || loadingInitial || loadingMore) return
    if (!hasMoreTareasRef.current && !hasMoreEventosRef.current) return

    fetchingRef.current = true
    setLoadingMore(true)

    try {
      const promises = [
        hasMoreTareasRef.current
          ? tareaService.obtenerPorCursor({
              id: cursorTareaRef.current,
              limit: pageLimit,
              fechaInicio: fechaInicioISO,
              fechaFin: fechaFinISO,
            })
          : Promise.resolve(null),
        hasMoreEventosRef.current
          ? eventoService.obtenerPorCursor({
              id: cursorEventoRef.current,
              limit: pageLimit,
              fechaInicio: fechaInicioISO,
              fechaFin: fechaFinISO,
            })
          : Promise.resolve(null),
      ]

      const [nuevasTareas, nuevosEventos] = await Promise.all(promises)

      if (Array.isArray(nuevasTareas)) {
        setTareasRaw((prev) => {
          const existingIds = new Set(prev.map((x) => x.idActividad))
          const filtered = nuevasTareas.filter((x) => !existingIds.has(x.idActividad))
          return [...prev, ...filtered]
        })
        const moreT = nuevasTareas.length >= pageLimit
        hasMoreTareasRef.current = moreT
        setHasMoreTareas(moreT)
        if (nuevasTareas.length > 0) {
          cursorTareaRef.current = nuevasTareas[nuevasTareas.length - 1].idActividad
        }
      }

      if (Array.isArray(nuevosEventos)) {
        setEventosRaw((prev) => {
          const existingIds = new Set(prev.map((x) => x.idActividad))
          const filtered = nuevosEventos.filter((x) => !existingIds.has(x.idActividad))
          return [...prev, ...filtered]
        })
        const moreE = nuevosEventos.length >= pageLimit
        hasMoreEventosRef.current = moreE
        setHasMoreEventos(moreE)
        if (nuevosEventos.length > 0) {
          cursorEventoRef.current = nuevosEventos[nuevosEventos.length - 1].idActividad
        }
      }
    } catch (err) {
      setError(err?.mensaje || err?.message || 'Error al cargar más actividades.')
    } finally {
      setLoadingMore(false)
      fetchingRef.current = false
    }
  }, [fechaInicioISO, fechaFinISO, loadingInitial, loadingMore, pageLimit])

  const routinesHidden = range === 'month' || range === 'year'

  const { items: inRangeItems } = useMemo(
    () => mergeAndSortFeed(tareasRaw, eventosRaw, { hideRoutines: routinesHidden }),
    [tareasRaw, eventosRaw, routinesHidden],
  )

  const { items: allLoadedItems } = useMemo(
    () => mergeAndSortFeed(tareasRaw, eventosRaw, { hideRoutines: false }),
    [tareasRaw, eventosRaw],
  )

  /**
   * Filtrado local en memoria (Cero peticiones extra a /agenda/actividades/etiqueta)
   */
  const visibleItems = useMemo(() => {
    if (!selectedTags.length) return inRangeItems
    const selectedSet = new Set(selectedTags.map((s) => String(s).toLowerCase()))
    return inRangeItems.filter((item) =>
      item.etiquetas?.some(
        (tag) =>
          selectedSet.has(String(tag.id).toLowerCase()) ||
          selectedSet.has(String(tag.nombre).toLowerCase()) ||
          selectedSet.has(String(tag.label).toLowerCase()),
      ),
    )
  }, [inRangeItems, selectedTags])

  /**
   * Contador de actividades por etiqueta calculado en memoria dentro del rango actual
   */
  const tagCounts = useMemo(() => {
    const countsByKey = {}
    for (const item of inRangeItems) {
      if (!Array.isArray(item.etiquetas)) continue
      for (const tag of item.etiquetas) {
        if (tag.id !== undefined && tag.id !== null) {
          countsByKey[tag.id] = (countsByKey[tag.id] || 0) + 1
        }
        if (tag.nombre) {
          const norm = tag.nombre.toLowerCase()
          countsByKey[norm] = (countsByKey[norm] || 0) + 1
        }
      }
    }
    return countsByKey
  }, [inRangeItems])

  /**
   * Toggle optimista de completado de tarea + registro opcional de sesión en POST /agenda/tareas/sesion
   * asegurando que fechaProgramada esté entre fechaInicio y fechaFin de la actividad.
   */
  const toggleTask = useCallback(async (item) => {
    if (!item || item.kind !== 'task') return
    const nextEstado = item.done ? 'PENDIENTE' : 'COMPLETADA'

    setTareasRaw((prev) =>
      prev.map((t) => (t.idActividad === item.idActividad ? { ...t, estado: nextEstado } : t)),
    )

    if (nextEstado === 'COMPLETADA') {
      try {
        const fechaProgramada = extractDateKeyFromISO(item.fechaInicio)
        const horaInicio = `${extractTimeFromISO(item.fechaInicio)}:00`
        const rawHoraFin = `${extractTimeFromISO(item.fechaFin || item.fechaInicio)}:00`
        const horaFin = rawHoraFin >= horaInicio ? rawHoraFin : horaInicio

        await tareaService.registrarSesion({
          idActividad: item.idActividad,
          fechaProgramada,
          horaInicio,
          horaFin,
          estado: 'COMPLETADA',
          notas: 'Completada desde el tablero',
        })
      } catch {
        // El estado visual ya se actualizó de forma optimista
      }
    }
  }, [])

  return {
    inRangeItems,
    allLoadedItems,
    visibleItems,
    tagCounts,
    routinesHidden,
    hasMore: hasMoreTareas || hasMoreEventos,
    loadingInitial,
    loadingMore,
    error,
    loadMore,
    refreshFeed: fetchInitial,
    toggleTask,
  }
}
