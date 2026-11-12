import { extractDateKeyFromISO } from '../../../shared/utils/isoDateFormatter'
import { addDays, fromKey, getMonthMatrix, startOfWeek, toKey } from './dateRangeCalculator'

/**
 * Calcula la diferencia entera en días calendario entre dos claves YYYY-MM-DD (dateKeyA - dateKeyB).
 */
export function diffDays(dateKeyA, dateKeyB) {
  const a = fromKey(dateKeyA)
  const b = fromKey(dateKeyB)
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcA - utcB) / 86_400_000)
}

/**
 * Obtiene [startDateKey, endDateKey] de una actividad asegurando que endDateKey >= startDateKey.
 * Soporta Eventos y Tareas multi-día (donde fechaFin abarca varios días).
 */
export function getActivityDateSpan(item) {
  const startDateKey = extractDateKeyFromISO(item.fechaInicio) || item.date
  const rawEndKey =
    extractDateKeyFromISO(item.fechaFin) ||
    item.endDate ||
    extractDateKeyFromISO(item.fechaInicio) ||
    startDateKey
  const endDateKey = rawEndKey >= startDateKey ? rawEndKey : startDateKey
  const totalDays = Math.max(1, diffDays(endDateKey, startDateKey) + 1)
  return { startDateKey, endDateKey, totalDays }
}

/**
 * Calcula los segmentos horizontales y carriles (lanes) sin colisiones para una fila semanal de 7 días (DOM..SÁB).
 *
 * @param {Array<{ date: Date, dateKey?: string, inMonth?: boolean }>} weekDays - Arreglo de 7 días (DOM a SÁB)
 * @param {Array<Object>} items - Actividades visibles del tablero
 */
export function buildWeekSpanLayout(weekDays, items = []) {
  if (!Array.isArray(weekDays) || weekDays.length !== 7) {
    return { segments: [], laneCount: 0 }
  }

  const normalizedDays = weekDays.map((d) => {
    const dateObj = d.date instanceof Date ? d.date : fromKey(d.dateKey || d)
    const dateKey = d.dateKey || toKey(dateObj)
    return {
      date: dateObj,
      dateKey,
      inMonth: d.inMonth ?? true,
    }
  })

  const weekStartKey = normalizedDays[0].dateKey
  const weekEndKey = normalizedDays[6].dateKey

  const rawSegments = []

  for (const item of items) {
    if (!item) continue
    const { startDateKey, endDateKey, totalDays } = getActivityDateSpan(item)
    if (!startDateKey) continue

    // Verifica solapamiento con la semana [weekStartKey, weekEndKey]
    if (startDateKey <= weekEndKey && endDateKey >= weekStartKey) {
      const startCol = Math.max(0, diffDays(startDateKey, weekStartKey))
      const endCol = Math.min(6, diffDays(endDateKey, weekStartKey))
      const spanCols = Math.max(1, endCol - startCol + 1)
      const continuesLeft = startDateKey < weekStartKey
      const continuesRight = endDateKey > weekEndKey

      rawSegments.push({
        id: `${item.id}-${weekStartKey}`,
        item,
        startDateKey,
        endDateKey,
        totalDays,
        startCol,
        endCol,
        spanCols,
        continuesLeft,
        continuesRight,
        laneIndex: 0,
      })
    }
  }

  // Ordenar por columna de inicio ASC, luego mayor duración (spanCols DESC), luego hora de inicio ASC
  rawSegments.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol
    if (b.spanCols !== a.spanCols) return b.spanCols - a.spanCols
    const startA = a.item.start ?? 0
    const startB = b.item.start ?? 0
    if (startA !== startB) return startA - startB
    return String(a.item.title || '').localeCompare(String(b.item.title || ''))
  })

  // Asignación de carriles (lanes) sin colisiones
  const lanes = [] // cada carril es un array booleano de 7 columnas [false..false]

  for (const seg of rawSegments) {
    let assignedLane = -1
    for (let l = 0; l < lanes.length; l++) {
      let free = true
      for (let c = seg.startCol; c <= seg.endCol; c++) {
        if (lanes[l][c]) {
          free = false
          break
        }
      }
      if (free) {
        assignedLane = l
        break
      }
    }

    if (assignedLane === -1) {
      assignedLane = lanes.length
      lanes.push([false, false, false, false, false, false, false])
    }

    for (let c = seg.startCol; c <= seg.endCol; c++) {
      lanes[assignedLane][c] = true
    }

    seg.laneIndex = assignedLane
  }

  return {
    days: normalizedDays,
    segments: rawSegments,
    laneCount: lanes.length,
  }
}

/**
 * Construye las matrices semanales para 'week', 'month' o 'year'.
 */
export function buildWeeksForWeekRange(activeDate) {
  const start = startOfWeek(activeDate)
  const week = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i)
    week.push({ date, dateKey: toKey(date), inMonth: true })
  }
  return [week]
}

export function buildWeeksForMonthRange(year, month) {
  const matrix = getMonthMatrix(year, month)
  return matrix.map((week) =>
    week.map((cell) => ({
      date: cell.date,
      dateKey: toKey(cell.date),
      inMonth: cell.inMonth,
    })),
  )
}
