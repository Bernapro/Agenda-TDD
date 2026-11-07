import { useCallback, useMemo, useState } from 'react'
import { extractDateKeyFromISO, pad2 } from '../../../shared/utils/isoDateFormatter'
import { actividadSearchService } from '../../search/services/actividadSearchService'

/**
 * Consume GET /agenda/actividades/mes?fecha=YYYY-MM-01 (capturando 404 -> [])
 * y combina las fechas devueltas con las actividades ya cargadas en memoria
 * para mostrar los puntos indicadores (3px x 3px) en <MiniMonthCalendar />.
 */
export function useCalendarMonthMarks(loadedItems = []) {
  const [monthCache, setMonthCache] = useState({})

  const fetchMonthMarks = useCallback(async (year, monthIndex) => {
    const monthKey = `${year}-${pad2(monthIndex + 1)}`
    const fechaParam = `${monthKey}-01`
    try {
      const actividades = await actividadSearchService.obtenerPorMes(fechaParam)
      const dateKeys = []
      if (Array.isArray(actividades)) {
        for (const act of actividades) {
          const k = extractDateKeyFromISO(act.fechaInicio)
          if (k) dateKeys.push(k)
        }
      }
      setMonthCache((prev) => ({ ...prev, [monthKey]: dateKeys }))
    } catch {
      setMonthCache((prev) => ({ ...prev, [monthKey]: [] }))
    }
  }, [])

  const loadedDateSet = useMemo(() => {
    const s = new Set()
    for (const item of loadedItems) {
      if (item?.date) s.add(item.date)
    }
    return s
  }, [loadedItems])

  const getMarkedKeys = useCallback(
    (startDate, endDate, viewDate) => {
      const target = viewDate || startDate
      if (target) {
        const y = target.getFullYear()
        const m = target.getMonth()
        const key = `${y}-${pad2(m + 1)}`
        if (monthCache[key] === undefined) {
          fetchMonthMarks(y, m)
        }
      }

      const combined = new Set(loadedDateSet)
      Object.values(monthCache).forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((d) => combined.add(d))
        }
      })
      return combined
    },
    [monthCache, loadedDateSet, fetchMonthMarks],
  )

  const invalidateMonthCache = useCallback(() => {
    setMonthCache({})
  }, [])

  return {
    getMarkedKeys,
    fetchMonthMarks,
    invalidateMonthCache,
  }
}
