import { sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'
import {
  buildWeekSpanLayout,
  buildWeeksForMonthRange,
  buildWeeksForWeekRange,
  getActivityDateSpan,
} from './calendarSpanLayout'
import {
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  capitalize,
  formatDuration,
  formatHeader,
  fromKey,
  getRangeBounds,
  minutesToTime,
  pad2,
  toKey,
} from './dateRangeCalculator'

const KIND_LABEL = { event: 'Evento', task: 'Tarea', routine: 'Rutina' }

const endOf = (o) => (o.kind === 'event' ? o.end : Math.min(o.start + (o.kind === 'task' ? 15 : 30), 24 * 60 - 1))

function formatTagsString(item) {
  if (!Array.isArray(item.etiquetas) || item.etiquetas.length === 0) return ''
  return item.etiquetas.map((t) => `#${stripLeadingHash(t.nombre || t.label)}`).join(' ')
}

function escapeHtml(str = '') {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatShortDateKey(dateKey) {
  if (!dateKey) return ''
  const d = fromKey(dateKey)
  return `${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`
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
    const { startDateKey, endDateKey } = getActivityDateSpan(o)
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
      `DTSTART:${icsLocal(startDateKey || o.date, o.start)}`,
      `DTEND:${icsLocal(endDateKey || o.date, endOf(o))}`,
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
  const header = ['Fecha Inicio', 'Fecha Fin', 'Hora Inicio', 'Hora Fin', 'Tipo', 'Título', 'Etiqueta', 'Ubicación', 'Invitados', 'Estado']
  const rows = occurrences.map((o) => {
    const { startDateKey, endDateKey } = getActivityDateSpan(o)
    return [
      startDateKey || o.date,
      endDateKey || o.date,
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
    ]
  })
  return '\uFEFF' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export const downloadICS = (occ, name, base) =>
  download(buildICS(occ, name), `${base}.ics`, 'text/calendar;charset=utf-8')

export const downloadCSV = (occ, base) =>
  download(buildCSV(occ), `${base}.csv`, 'text/csv;charset=utf-8')

// ---------- Generación de Documento PDF Editorial (HTML autónomo en iframe de impresión) ----------

function buildWeekTableHtml(weekDays, items) {
  const { days, segments } = buildWeekSpanLayout(weekDays, items)
  const dayCellsHtml = days
    .map(
      (d) => `
      <div class="cal-day-num ${d.inMonth ? '' : 'cal-day-outside'}">
        <span>${pad2(d.date.getDate())}</span>
        ${d.date.getDate() === 1 ? `<small>${escapeHtml(MONTHS_SHORT[d.date.getMonth()])}</small>` : ''}
      </div>`,
    )
    .join('')

  const segmentsHtml = segments
    .map((seg) => {
      const color = sanitizeHexColor(seg.item.hexColor, '#3B82F6')
      const timeStr = seg.item.todoElDia ? '' : `<span class="bar-time">${minutesToTime(seg.item.start)}</span>`
      const spanBadge =
        seg.totalDays > 1 && seg.spanCols >= 2
          ? `<span class="bar-span" style="color:${color}">${seg.totalDays}d</span>`
          : ''
      return `
        <div
          class="cal-bar ${seg.item.done ? 'cal-bar-done' : ''}"
          style="
            grid-column: ${seg.startCol + 1} / span ${seg.spanCols};
            grid-row: ${seg.laneIndex + 1};
            background-color: ${color}24;
            border-left: ${seg.continuesLeft ? 'none' : `3.5px solid ${color}`};
            border-bottom: 2px solid ${color};
            border-radius: ${seg.continuesLeft ? '0' : '5px'} ${seg.continuesRight ? '0' : '5px'} ${seg.continuesRight ? '0' : '5px'} ${seg.continuesLeft ? '0' : '5px'};
          "
        >
          ${seg.continuesLeft ? `<span style="color:${color};font-family:'Space Mono',monospace;font-size:9px">←</span>` : `<span class="bar-dot" style="background-color:${color}"></span>`}
          ${!seg.continuesLeft ? timeStr : ''}
          <span class="bar-title">${escapeHtml(seg.item.title)}</span>
          ${spanBadge}
          ${seg.continuesRight ? `<span style="color:${color};font-family:'Space Mono',monospace;font-size:9px">→</span>` : ''}
        </div>`
    })
    .join('')

  return `
    <div class="cal-week-row">
      <div class="cal-week-bg">
        ${days.map((d) => `<div class="${d.inMonth ? '' : 'cal-col-outside'}"></div>`).join('')}
      </div>
      <div class="cal-day-nums-grid">${dayCellsHtml}</div>
      ${segments.length > 0 ? `<div class="cal-bars-grid">${segmentsHtml}</div>` : '<div class="cal-bars-empty"></div>'}
    </div>
  `
}

function buildCalendarSectionHtml(occurrences, activeDate, range) {
  const weekdayHeaderHtml = `
    <div class="cal-weekday-header">
      ${WEEKDAYS_SHORT.map((w) => `<div>${escapeHtml(w.toUpperCase())}</div>`).join('')}
    </div>
  `

  if (range === 'week') {
    const weeks = buildWeeksForWeekRange(activeDate)
    return `
      <section class="pdf-section">
        <h2 class="section-heading">Vista de Calendario Semanal (Líneas de Duración)</h2>
        <div class="cal-card">
          ${weekdayHeaderHtml}
          ${weeks.map((w) => buildWeekTableHtml(w, occurrences)).join('')}
        </div>
      </section>
    `
  }

  if (range === 'month') {
    const weeks = buildWeeksForMonthRange(activeDate.getFullYear(), activeDate.getMonth())
    return `
      <section class="pdf-section">
        <h2 class="section-heading">Vista de Calendario Mensual — ${escapeHtml(capitalize(MONTHS[activeDate.getMonth()]))} ${activeDate.getFullYear()}</h2>
        <div class="cal-card">
          ${weekdayHeaderHtml}
          ${weeks.map((w) => buildWeekTableHtml(w, occurrences)).join('')}
        </div>
      </section>
    `
  }

  if (range === 'year') {
    const year = activeDate.getFullYear()
    const monthsWithItems = MONTHS.map((mName, mIdx) => {
      const monthPrefix = `${year}-${pad2(mIdx + 1)}`
      const hasAny = occurrences.some((o) => {
        const { startDateKey, endDateKey } = getActivityDateSpan(o)
        return startDateKey.slice(0, 7) <= monthPrefix && endDateKey.slice(0, 7) >= monthPrefix
      })
      if (!hasAny) return ''
      const weeks = buildWeeksForMonthRange(year, mIdx)
      return `
        <div class="cal-year-month">
          <div class="cal-month-title">${escapeHtml(capitalize(mName))} ${year}</div>
          <div class="cal-card">
            ${weekdayHeaderHtml}
            ${weeks.map((w) => buildWeekTableHtml(w, occurrences)).join('')}
          </div>
        </div>
      `
    })
      .filter(Boolean)
      .join('')

    if (!monthsWithItems) return ''
    return `
      <section class="pdf-section">
        <h2 class="section-heading">Calendario Anual de Actividades (${year})</h2>
        <div class="cal-year-grid">${monthsWithItems}</div>
      </section>
    `
  }

  return ''
}

function buildChronologicalListHtml(occurrences) {
  if (!occurrences.length) {
    return `<div class="empty-box">No hay actividades registradas en este periodo.</div>`
  }

  const groups = new Map()
  for (const o of occurrences) {
    groups.set(o.date, [...(groups.get(o.date) ?? []), o])
  }

  return [...groups]
    .map(([dateKey, items]) => {
      const date = fromKey(dateKey)
      const dayTitle = `${WEEKDAYS_SHORT[date.getDay()].toUpperCase()} · ${pad2(date.getDate())} de ${MONTHS[date.getMonth()]} del ${date.getFullYear()}`

      const rowsHtml = items
        .map((item) => {
          const color = sanitizeHexColor(item.hexColor, '#3B82F6')
          const { startDateKey, endDateKey, totalDays } = getActivityDateSpan(item)
          const isMultiDay = totalDays > 1

          const timeLabel = item.todoElDia
            ? 'Todo el día'
            : `${minutesToTime(item.start)} – ${minutesToTime(item.end)}`

          const durationMins = !item.todoElDia && !isMultiDay ? Math.max(0, (item.end ?? item.start) - item.start) : 0

          let metaBadges = ''
          if (isMultiDay) {
            metaBadges += `<span class="meta-pill">${escapeHtml(formatShortDateKey(startDateKey))} → ${escapeHtml(formatShortDateKey(endDateKey))} (${totalDays} días)</span>`
          } else if (durationMins > 0) {
            metaBadges += `<span class="meta-text">· ${escapeHtml(formatDuration(durationMins))}</span>`
          }

          if (item.kind === 'event') {
            if (item.direccion) {
              metaBadges += `<span class="meta-text">📍 ${escapeHtml(item.direccion)}</span>`
            }
            if (item.cantidadInvitados > 0) {
              metaBadges += `<span class="meta-text">👥 ${item.cantidadInvitados} ${item.cantidadInvitados === 1 ? 'invitado' : 'invitados'}</span>`
            }
          } else if (item.kind === 'task') {
            const statusText = item.done ? 'Completada ✓' : `Pendiente · Límite ${item.limitTime || minutesToTime(item.start)}`
            const prioText = item.prioridad ? `Prioridad ${item.prioridad}` : ''
            metaBadges += `<span class="meta-text">${escapeHtml(statusText)}</span>`
            if (prioText) metaBadges += `<span class="meta-pill">${escapeHtml(prioText)}</span>`
          } else if (item.kind === 'routine') {
            metaBadges += `<span class="meta-pill">Hábito · ${escapeHtml(item.repeatLabel || 'Rutina')}</span>`
            metaBadges += `<span class="meta-text">🔥 ${item.dias ?? 0} ${item.dias === 1 ? 'día' : 'días'}</span>`
          }

          const tagsHtml = (item.etiquetas || [])
            .map((t) => {
              const tColor = sanitizeHexColor(t.hexColor || t.color, '#6B7280')
              const tName = stripLeadingHash(t.nombre || t.label || '')
              if (!tName) return ''
              return `<span class="tag-pill" style="background-color:${tColor}1A;border-color:${tColor}55;color:${tColor}">
                <span class="tag-dot" style="background-color:${tColor}"></span>#${escapeHtml(tName)}
              </span>`
            })
            .join('')

          return `
            <div class="item-card">
              <div class="item-accent" style="background-color:${color}"></div>
              <div class="item-time">${escapeHtml(timeLabel)}</div>
              <div class="item-main">
                <div class="item-header-row">
                  <span class="kind-badge" style="color:${color};background-color:${color}18">${escapeHtml(KIND_LABEL[item.kind] || 'Actividad')}</span>
                  <span class="item-title ${item.done ? 'item-done' : ''}">${escapeHtml(item.title)}</span>
                </div>
                <div class="item-meta-row">${metaBadges}</div>
              </div>
              <div class="item-tags">${tagsHtml}</div>
            </div>
          `
        })
        .join('')

      return `
        <div class="day-group">
          <div class="day-header">${escapeHtml(dayTitle)}</div>
          <div class="day-items">${rowsHtml}</div>
        </div>
      `
    })
    .join('')
}

export function buildPrintableHTML({ occurrences = [], activeDate, range, today, boardView = 'list' }) {
  const title = exportTitle(activeDate, range, today)
  const now = new Date()
  const generatedAt = `${pad2(now.getDate())} ${MONTHS_SHORT[now.getMonth()]} ${now.getFullYear()}, ${pad2(now.getHours())}:${pad2(now.getMinutes())}`

  const eventsCount = occurrences.filter((o) => o.kind === 'event').length
  const tasks = occurrences.filter((o) => o.kind === 'task')
  const doneTasksCount = tasks.filter((o) => o.done).length
  const routinesCount = occurrences.filter((o) => o.kind === 'routine').length

  const showCalendar = boardView === 'calendar' && range !== 'day'
  const calendarSectionHtml = showCalendar ? buildCalendarSectionHtml(occurrences, activeDate, range) : ''
  const chronologicalHtml = buildChronologicalListHtml(occurrences)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(exportFileBase(activeDate, range))}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Sora:wght@500;600&family=Space+Mono&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: ${showCalendar ? 'A4 landscape' : 'A4 portrait'};
      margin: 12mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #1c1e1f;
      font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .report-container {
      width: 100%;
    }
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      border-bottom: 2px solid #2e6f5e;
      margin-bottom: 16px;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background-color: #2e6f5e;
      color: #ffffff;
      font-family: 'Sora', sans-serif;
      font-weight: 600;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #2e6f5e;
    }
    .report-title {
      font-family: 'Sora', sans-serif;
      font-size: 19px;
      font-weight: 600;
      color: #1c1e1f;
      margin: 2px 0 0 0;
    }
    .report-meta {
      text-align: right;
      font-family: 'Space Mono', monospace;
      font-size: 10.5px;
      color: #687076;
    }
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .stat-card {
      background: #faf9f6;
      border: 1px solid #e4e2dd;
      border-radius: 10px;
      padding: 8px 12px;
    }
    .stat-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #687076;
      font-weight: 600;
    }
    .stat-value {
      font-family: 'Space Mono', monospace;
      font-size: 15px;
      font-weight: 600;
      color: #1c1e1f;
      margin-top: 2px;
    }
    .pdf-section {
      margin-bottom: 22px;
    }
    .section-heading {
      font-family: 'Sora', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: #1c1e1f;
      margin: 0 0 8px 0;
    }
    /* Calendario Horizontal Multi-Día */
    .cal-card {
      border: 1px solid #e4e2dd;
      border-radius: 10px;
      overflow: hidden;
      background: #ffffff;
    }
    .cal-weekday-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #f1efea;
      border-bottom: 1px solid #e4e2dd;
      text-align: center;
      font-size: 9.5px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #687076;
      padding: 6px 0;
    }
    .cal-week-row {
      position: relative;
      border-bottom: 1px solid #e4e2dd;
      min-height: 64px;
      page-break-inside: avoid;
    }
    .cal-week-row:last-child {
      border-bottom: none;
    }
    .cal-week-bg {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      pointer-events: none;
    }
    .cal-week-bg > div {
      border-right: 1px solid #eceae4;
    }
    .cal-week-bg > div:last-child {
      border-right: none;
    }
    .cal-col-outside {
      background: #faf9f6;
    }
    .cal-day-nums-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
    }
    .cal-day-num {
      padding: 4px 7px;
      font-family: 'Space Mono', monospace;
      font-size: 10.5px;
      font-weight: 600;
      color: #1c1e1f;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .cal-day-outside {
      color: #b0b5ba;
    }
    .cal-bars-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      column-gap: 3px;
      row-gap: 4px;
      padding: 2px 5px 8px 5px;
    }
    .cal-bars-empty {
      height: 24px;
    }
    .cal-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 21px;
      padding: 0 6px;
      font-size: 10px;
      font-weight: 500;
      color: #1c1e1f;
      overflow: hidden;
      white-space: nowrap;
    }
    .cal-bar-done .bar-title {
      text-decoration: line-through;
      opacity: 0.65;
    }
    .bar-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .bar-time {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      color: #687076;
      flex-shrink: 0;
    }
    .bar-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
    .bar-span {
      font-family: 'Space Mono', monospace;
      font-size: 8.5px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .cal-year-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .cal-month-title {
      font-family: 'Sora', sans-serif;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #2e6f5e;
    }
    /* Listado Cronológico */
    .day-group {
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .day-header {
      font-family: 'Sora', sans-serif;
      font-size: 11.5px;
      font-weight: 600;
      color: #2e6f5e;
      padding-bottom: 4px;
      border-bottom: 1px solid #e4e2dd;
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }
    .day-items {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .item-card {
      position: relative;
      display: grid;
      grid-template-columns: 110px 1fr auto;
      align-items: center;
      gap: 10px;
      border: 1px solid #e4e2dd;
      border-radius: 8px;
      background: #ffffff;
      padding: 7px 10px 7px 14px;
      overflow: hidden;
    }
    .item-accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }
    .item-time {
      font-family: 'Space Mono', monospace;
      font-size: 10.5px;
      color: #687076;
    }
    .item-header-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kind-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 1px 6px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .item-title {
      font-size: 12.5px;
      font-weight: 600;
      color: #1c1e1f;
    }
    .item-done {
      text-decoration: line-through;
      color: #687076;
    }
    .item-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 3px;
      font-size: 10.5px;
      color: #687076;
    }
    .meta-pill {
      background: #f1efea;
      border-radius: 999px;
      padding: 1px 7px;
      font-family: 'Space Mono', monospace;
      font-size: 9.5px;
      color: #1c1e1f;
    }
    .item-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: flex-end;
    }
    .tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid;
      border-radius: 999px;
      padding: 1px 7px;
      font-size: 10px;
      font-weight: 500;
    }
    .tag-dot {
      width: 5px;
      height: 5px;
      border-radius: 999px;
    }
    .empty-box {
      padding: 24px;
      text-align: center;
      background: #faf9f6;
      border: 1px dashed #e4e2dd;
      border-radius: 10px;
      color: #687076;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <header class="report-header">
      <div class="brand-row">
        <div class="brand-logo">A</div>
        <div>
          <div class="brand-label">Agenda Personal Minimalista</div>
          <h1 class="report-title">${escapeHtml(title)}</h1>
        </div>
      </div>
      <div class="report-meta">
        <div>Exportado: ${escapeHtml(generatedAt)}</div>
        <div>Vista: ${showCalendar ? 'Calendario Horizontal + Detalle' : 'Lista Cronológica'}</div>
      </div>
    </header>

    <section class="stats-bar">
      <div class="stat-card">
        <div class="stat-label">Total Actividades</div>
        <div class="stat-value">${occurrences.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Eventos</div>
        <div class="stat-value">${eventsCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tareas (Completadas)</div>
        <div class="stat-value">${doneTasksCount} / ${tasks.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Rutinas</div>
        <div class="stat-value">${routinesCount}</div>
      </div>
    </section>

    ${calendarSectionHtml}

    <section class="pdf-section">
      <h2 class="section-heading">Desglose Cronológico de Actividades</h2>
      ${chronologicalHtml}
    </section>
  </div>
</body>
</html>`
}

export function exportToPDF({ occurrences = [], activeDate, range, today, boardView = 'list' }) {
  const html = buildPrintableHTML({ occurrences, activeDate, range, today, boardView })
  const suggestedFileName = exportFileBase(activeDate, range)
  const previousTitle = document.title
  document.title = suggestedFileName

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document || iframe.contentDocument
  if (!doc) {
    document.title = previousTitle
    iframe.remove()
    window.print()
    return
  }

  doc.open()
  doc.write(html)
  doc.close()

  let printed = false
  const triggerPrint = () => {
    if (printed) return
    printed = true
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => {
        document.title = previousTitle
        iframe.remove()
      }, 1200)
    }
  }

  iframe.onload = () => {
    setTimeout(triggerPrint, 250)
  }
  setTimeout(triggerPrint, 700)
}

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
