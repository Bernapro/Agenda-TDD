import { fromDateKey, minutesToTime, pad2, toDateKey, toLocalDateTimeISO } from '../../../shared/utils/isoDateFormatter'

export { fromDateKey as fromKey, minutesToTime, pad2, toDateKey as toKey }

export const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
export const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
export const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
export const DB_WEEKDAY_CODES = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']

export const RANGE_OPTIONS = [
  { value: 'day', label: 'Hoy', unit: 'Día' },
  { value: 'week', label: 'Esta semana', unit: 'Semana' },
  { value: 'month', label: 'Este mes', unit: 'Mes' },
  { value: 'year', label: 'Este año', unit: 'Año' },
]

export const capitalize = (s = '') => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate()
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const addMonths = (d, n) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), daysInMonth(t.getFullYear(), t.getMonth())))
}

export const isSameDay = (a, b) =>
  Boolean(a && b) &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const startOfWeek = (d) => addDays(d, -d.getDay())

export function getRangeBounds(d, range) {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  switch (range) {
    case 'day':
      return { start: base, end: base }
    case 'week': {
      const start = startOfWeek(base)
      return { start, end: addDays(start, 6) }
    }
    case 'month':
      return {
        start: new Date(base.getFullYear(), base.getMonth(), 1),
        end: new Date(base.getFullYear(), base.getMonth() + 1, 0),
      }
    case 'year':
      return {
        start: new Date(base.getFullYear(), 0, 1),
        end: new Date(base.getFullYear(), 11, 31),
      }
    default:
      return { start: base, end: base }
  }
}

/**
 * Calcula fechaInicio y fechaFin en formato ISO local sin 'Z' (YYYY-MM-DDTHH:mm:ss)
 * para enviarlos a Spring Boot (@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime).
 */
export function calculateDateRangeISO(activeDate, range) {
  const { start, end } = getRangeBounds(activeDate, range)
  return {
    start,
    end,
    fechaInicioISO: toLocalDateTimeISO(start, 0, 0, 0),
    fechaFinISO: toLocalDateTimeISO(end, 23, 59, 59),
  }
}

export function rangeContains(d, range, target) {
  const { start, end } = getRangeBounds(d, range)
  const k = toDateKey(target)
  return k >= toDateKey(start) && k <= toDateKey(end)
}

export function stepDate(d, range, dir) {
  switch (range) {
    case 'day':
      return addDays(d, dir)
    case 'week':
      return addDays(d, 7 * dir)
    case 'month':
      return addMonths(d, dir)
    case 'year':
      return addMonths(d, 12 * dir)
    default:
      return addDays(d, dir)
  }
}

export const timeToMinutes = (t = '00:00') => {
  const [h, m] = String(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function formatDuration(mins) {
  const safe = Math.max(0, Math.round(Number(mins) || 0))
  const h = Math.floor(safe / 60)
  const m = safe % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * Hint corto en fuente monoespaciada a la derecha de cada opción en <TimeRangeSelect />
 */
export function rangeHint(range, ref) {
  const { start, end } = getRangeBounds(ref, range)
  switch (range) {
    case 'day':
      return `${pad2(ref.getDate())} ${MONTHS_SHORT[ref.getMonth()]}`
    case 'week':
      return `${pad2(start.getDate())} ${MONTHS_SHORT[start.getMonth()]} – ${pad2(end.getDate())} ${MONTHS_SHORT[end.getMonth()]}`
    case 'month':
      return `${MONTHS_SHORT[ref.getMonth()]} ${ref.getFullYear()}`
    case 'year':
      return String(ref.getFullYear())
    default:
      return ''
  }
}

/**
 * Texto editorial de <TopDateHeader /> dividido en lead (font-semibold text-ink) y rest (font-medium text-ink-soft).
 */
export function formatHeader(d, range, today) {
  const isCurrent = rangeContains(d, range, today)
  switch (range) {
    case 'day': {
      const lead = isSameDay(d, today)
        ? 'Hoy'
        : isSameDay(d, addDays(today, 1))
          ? 'Mañana'
          : isSameDay(d, addDays(today, -1))
            ? 'Ayer'
            : capitalize(WEEKDAYS[d.getDay()])
      return { lead: `${lead},`, rest: `${pad2(d.getDate())} de ${MONTHS[d.getMonth()]} del ${d.getFullYear()}` }
    }
    case 'week': {
      const { start: s, end: e } = getRangeBounds(d, 'week')
      const rest =
        s.getMonth() === e.getMonth()
          ? `${pad2(s.getDate())} – ${pad2(e.getDate())} de ${MONTHS[e.getMonth()]} del ${e.getFullYear()}`
          : `${pad2(s.getDate())} ${MONTHS_SHORT[s.getMonth()]} – ${pad2(e.getDate())} ${MONTHS_SHORT[e.getMonth()]} del ${e.getFullYear()}`
      return { lead: isCurrent ? 'Esta semana,' : 'Semana del', rest }
    }
    case 'month':
      return isCurrent
        ? { lead: 'Este mes,', rest: `${MONTHS[d.getMonth()]} del ${d.getFullYear()}` }
        : { lead: capitalize(MONTHS[d.getMonth()]), rest: `del ${d.getFullYear()}` }
    case 'year':
      return isCurrent ? { lead: 'Este año,', rest: String(d.getFullYear()) } : { lead: 'Año', rest: String(d.getFullYear()) }
    default:
      return { lead: '', rest: '' }
  }
}

export function getMonthMatrix(year, month) {
  const first = new Date(year, month, 1)
  const lead = first.getDay()
  const total = Math.ceil((lead + daysInMonth(year, month)) / 7) * 7
  const start = addDays(first, -lead)
  const weeks = []
  for (let i = 0; i < total; i++) {
    const date = addDays(start, i)
    if (i % 7 === 0) weeks.push([])
    weeks[weeks.length - 1].push({ date, inMonth: date.getMonth() === month })
  }
  return weeks
}
