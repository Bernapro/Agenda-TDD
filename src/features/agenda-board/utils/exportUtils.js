import { stripLeadingHash } from '../../../shared/api/httpClient'
import { formatHeader, getRangeBounds, minutesToTime, pad2, toKey } from './dateRangeCalculator'

const KIND_LABEL = { event: 'Evento', task: 'Tarea', routine: 'Rutina' }

const endOf = (o) => (o.kind === 'event' ? o.end : Math.min(o.start + (o.kind === 'task' ? 15 : 30), 24 * 60 - 1))

function formatTagsString(item) {
  if (!Array.isArray(item.etiquetas) || item.etiquetas.length === 0) return ''
  return item.etiquetas.map((t) => `#${stripLeadingHash(t.nombre || t.label)}`).join(' ')
}

export function exportFileBase(activeDate, range) {
  const { start } = getRangeBounds(activeDate, range)
  switch (range) {
    case 'day':
      return `agenda-${toKey(activeDate)}`
    case 'week':
      return `agenda-semana-${toKey(start)}`
    case 'month':
      return `agenda-${toKey(start).slice(0, 7)}`
    case 'year':
      return `agenda-${start.getFullYear()}`
    default:
      return `agenda-${toKey(activeDate)}`
  }
}

export function exportTitle(activeDate, range, today) {
  const { lead, rest } = formatHeader(activeDate, range, today)
  return `Agenda — ${lead} ${rest}`
}

function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------- iCalendar (RFC 5545) ----------

const icsEscape = (s = '') =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

const icsLocal = (dateKey, minutes) =>
  `${String(dateKey).replace(/-/g, '')}T${pad2(Math.floor(minutes / 60))}${pad2(minutes % 60)}00`

function fold(line) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function buildICS(occurrences, calendarName) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda//Dashboard//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ]

  for (const o of occurrences) {
    const tagsText = formatTagsString(o)
    const firstTagLabel = o.etiquetas?.[0] ? stripLeadingHash(o.etiquetas[0].nombre || o.etiquetas[0].label) : ''
    const details =
      o.kind === 'event'
        ? [o.cantidadInvitados ? `${o.cantidadInvitados} invitados` : '', tagsText]
        : o.kind === 'task'
          ? [`Tarea · ${o.done ? 'completada' : `límite ${o.limitTime || minutesToTime(o.start)}`}`, tagsText]
          : [`Rutina · ${o.repeatLabel || 'Hábito'}`, tagsText]

    lines.push(
      'BEGIN:VEVENT',
      `UID:${String(o.id).replace(/[^\w-]/g, '-')}@agenda.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsLocal(o.date, o.start)}`,
      `DTEND:${icsLocal(o.date, endOf(o))}`,
      `SUMMARY:${icsEscape(o.kind === 'event' ? o.title : `${KIND_LABEL[o.kind]}: ${o.title}`)}`,
      `DESCRIPTION:${icsEscape(details.filter(Boolean).join('\n'))}`,
    )
    if (firstTagLabel) lines.push(`CATEGORIES:${icsEscape(firstTagLabel)}`)
    if (o.kind === 'event' && o.direccion) lines.push(`LOCATION:${icsEscape(o.direccion)}`)
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

// ---------- CSV (RFC 4180, UTF-8 con BOM para Excel) ----------

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCSV(occurrences) {
  const header = ['Fecha', 'Inicio', 'Fin', 'Tipo', 'Título', 'Etiqueta', 'Ubicación', 'Invitados', 'Estado']
  const rows = occurrences.map((o) => [
    o.date,
    minutesToTime(o.start),
    o.kind === 'event' ? minutesToTime(o.end) : o.endTimeText || '',
    KIND_LABEL[o.kind],
    o.title,
    formatTagsString(o),
    o.kind === 'event' ? (o.direccion ?? '') : '',
    o.kind === 'event' ? (o.cantidadInvitados || '') : '',
    o.kind === 'task'
      ? o.done
        ? 'Completada'
        : `Pendiente (${o.prioridad || 'MEDIA'})`
      : o.kind === 'routine'
        ? `Hábito · ${o.repeatLabel || 'Rutina'} (${o.dias ?? 0} días)`
        : o.todoElDia
          ? 'Todo el día'
          : '',
  ])
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export const downloadICS = (occ, name, base) =>
  download(buildICS(occ, name), `${base}.ics`, 'text/calendar;charset=utf-8')

export const downloadCSV = (occ, base) =>
  download(buildCSV(occ), `${base}.csv`, 'text/csv;charset=utf-8')

export function printView(title) {
  const previous = document.title
  document.title = title
  const restore = () => {
    document.title = previous
    window.removeEventListener('afterprint', restore)
  }
  window.addEventListener('afterprint', restore)
  window.print()
}
