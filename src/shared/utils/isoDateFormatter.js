export const pad2 = (n) => String(n).padStart(2, '0')

/**
 * Convierte un objeto Date a string YYYY-MM-DD local.
 */
export function toDateKey(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * Convierte un string YYYY-MM-DD (o ISO LocalDateTime) a Date local a las 00:00:00.
 */
export function fromDateKey(key) {
  if (!key) return new Date()
  if (key instanceof Date) return new Date(key.getFullYear(), key.getMonth(), key.getDate())
  const datePart = String(key).split('T')[0]
  const [y, m, d] = datePart.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/**
 * Formatea un Date a ISO LocalDateTime sin 'Z' para Spring Boot: YYYY-MM-DDTHH:mm:ss
 */
export function toLocalDateTimeISO(date, hours = 0, minutes = 0, seconds = 0) {
  const d = date instanceof Date ? date : fromDateKey(date)
  return `${toDateKey(d)}T${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

/**
 * Construye un string ISO LocalDateTime ("YYYY-MM-DDTHH:mm:ss") a partir de fecha ("YYYY-MM-DD") y hora ("HH:mm").
 */
export function combineDateAndTimeISO(dateStr, timeStr = '00:00', seconds = '00') {
  const cleanDate = String(dateStr).split('T')[0]
  const [hh = '00', mm = '00'] = String(timeStr).split(':')
  return `${cleanDate}T${pad2(Number(hh) || 0)}:${pad2(Number(mm) || 0)}:${pad2(Number(seconds) || 0)}`
}

/**
 * Extrae la fecha "YYYY-MM-DD" de un string ISO LocalDateTime ("2026-11-02T09:00:00").
 */
export function extractDateKeyFromISO(isoString) {
  if (!isoString) return ''
  if (isoString instanceof Date) return toDateKey(isoString)
  return String(isoString).split('T')[0]
}

/**
 * Extrae "HH:mm" de un string ISO LocalDateTime ("2026-11-02T09:30:00") o minutos desde medianoche.
 */
export function extractTimeFromISO(isoString) {
  if (!isoString) return '00:00'
  const str = String(isoString)
  if (str.includes('T')) {
    const timePart = str.split('T')[1] || '00:00'
    const [hh = '00', mm = '00'] = timePart.split(':')
    return `${pad2(Number(hh) || 0)}:${pad2(Number(mm) || 0)}`
  }
  const [hh = '00', mm = '00'] = str.split(':')
  return `${pad2(Number(hh) || 0)}:${pad2(Number(mm) || 0)}`
}

/**
 * Convierte "HH:mm" o un ISO LocalDateTime a minutos desde medianoche.
 */
export function isoOrTimeToMinutes(value) {
  if (typeof value === 'number') return value
  const hhmm = extractTimeFromISO(value)
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Convierte minutos desde medianoche a "HH:mm".
 */
export function minutesToTime(m) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.floor(Number(m) || 0)))
  return `${pad2(Math.floor(safe / 60))}:${pad2(safe % 60)}`
}
