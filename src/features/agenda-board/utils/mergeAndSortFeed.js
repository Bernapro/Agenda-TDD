import { sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'
import { extractDateKeyFromISO, extractTimeFromISO, isoOrTimeToMinutes } from '../../../shared/utils/isoDateFormatter'
import { calcularDiasDesdeInicio, resolveTaskOrRoutineKind } from '../../tasks-routines/utils/routineDaysCalculator'

const KIND_ORDER = {
  routine: 0,
  event: 1,
  task: 2,
}

export function normalizeTagDto(tag) {
  if (!tag) return null
  const rawName = tag.nombre || tag.label || ''
  const label = stripLeadingHash(rawName)
  if (!label) return null
  const nombre = `#${label}`
  const color = sanitizeHexColor(tag.hexColor || tag.color, '#6B7280')
  return {
    id: tag.id ?? nombre.toLowerCase(),
    nombre,
    label,
    hexColor: color,
    color,
  }
}

export function normalizeTareaOrRoutine(dto) {
  const kind = resolveTaskOrRoutineKind(dto)
  const defaultColor = kind === 'routine' ? '#8B5CF6' : '#D97706'
  const hexColor = sanitizeHexColor(dto.hexColor, defaultColor)
  const etiquetas = Array.isArray(dto.etiquetas) ? dto.etiquetas.map(normalizeTagDto).filter(Boolean) : []
  const dateKey = extractDateKeyFromISO(dto.fechaInicio || dto.fechaLimite)
  const rawEndDateKey = extractDateKeyFromISO(dto.fechaFin || dto.fechaInicio || dto.fechaLimite) || dateKey
  const endDateKey = rawEndDateKey >= dateKey ? rawEndDateKey : dateKey
  const startMinutes = isoOrTimeToMinutes(dto.fechaInicio)
  const endMinutes = dto.fechaFin ? isoOrTimeToMinutes(dto.fechaFin) : Math.min(startMinutes + 30, 23 * 60 + 59)
  const limitTime = dto.fechaLimite ? extractTimeFromISO(dto.fechaLimite) : extractTimeFromISO(dto.fechaFin || dto.fechaInicio)

  if (kind === 'routine') {
    const dias = calcularDiasDesdeInicio(dto.fechaInicio)
    return {
      id: `routine-${dto.idActividad}`,
      idActividad: dto.idActividad,
      kind: 'routine',
      titulo: dto.titulo || 'Rutina sin título',
      title: dto.titulo || 'Rutina sin título',
      hexColor,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      fechaLimite: null,
      date: dateKey,
      endDate: endDateKey,
      start: startMinutes,
      end: endMinutes,
      startTimeText: extractTimeFromISO(dto.fechaInicio),
      endTimeText: extractTimeFromISO(dto.fechaFin || dto.fechaInicio),
      estado: dto.estado || 'PENDIENTE',
      prioridad: dto.prioridad || 'MEDIA',
      repeatLabel: dto.repeatLabel || 'Rutina',
      streak: dias,
      dias,
      etiquetas,
    }
  }

  const done = dto.estado === 'COMPLETADA'
  return {
    id: `task-${dto.idActividad}`,
    idActividad: dto.idActividad,
    kind: 'task',
    titulo: dto.titulo || 'Tarea sin título',
    title: dto.titulo || 'Tarea sin título',
    hexColor,
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    fechaLimite: dto.fechaLimite,
    limitTime,
    date: dateKey,
    endDate: endDateKey,
    start: startMinutes,
    end: endMinutes,
    startTimeText: extractTimeFromISO(dto.fechaInicio),
    endTimeText: extractTimeFromISO(dto.fechaFin || dto.fechaInicio),
    estado: dto.estado || 'PENDIENTE',
    done,
    prioridad: dto.prioridad || 'MEDIA',
    etiquetas,
  }
}

export function normalizeEvento(dto) {
  const hexColor = sanitizeHexColor(dto.hexColor, '#3B82F6')
  const etiquetas = Array.isArray(dto.etiquetas) ? dto.etiquetas.map(normalizeTagDto).filter(Boolean) : []
  const dateKey = extractDateKeyFromISO(dto.fechaInicio)
  const rawEndDateKey = extractDateKeyFromISO(dto.fechaFin || dto.fechaInicio) || dateKey
  const endDateKey = rawEndDateKey >= dateKey ? rawEndDateKey : dateKey
  const startMinutes = isoOrTimeToMinutes(dto.fechaInicio)
  const rawEndMinutes = dto.fechaFin ? isoOrTimeToMinutes(dto.fechaFin) : startMinutes + 60
  const endMinutes = rawEndMinutes >= startMinutes ? rawEndMinutes : startMinutes + 60

  return {
    id: `event-${dto.idActividad}`,
    idActividad: dto.idActividad,
    kind: 'event',
    titulo: dto.titulo || 'Evento sin título',
    title: dto.titulo || 'Evento sin título',
    hexColor,
    todoElDia: Boolean(dto.todoElDia),
    direccion: dto.direccion?.trim() || '',
    location: dto.direccion?.trim() || '',
    cantidadInvitados: Number(dto.cantidadInvitados) || 0,
    guests: Number(dto.cantidadInvitados) || 0,
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    date: dateKey,
    endDate: endDateKey,
    start: startMinutes,
    end: endMinutes,
    startTimeText: extractTimeFromISO(dto.fechaInicio),
    endTimeText: extractTimeFromISO(dto.fechaFin || dto.fechaInicio),
    etiquetas,
  }
}

/**
 * Une las tareas, rutinas y eventos en una sola colección normalizada en memoria (deduplicando por idActividad),
 * y los ordena cronológicamente por fechaInicio ascendente, desempatando por: routine (0) -> event (1) -> task (2).
 */
export function mergeAndSortFeed(tareasRaw = [], eventosRaw = [], { hideRoutines = false } = {}) {
  const byId = new Map()
  let hasAnyRoutines = false

  for (const t of tareasRaw) {
    if (!t || t.idActividad == null) continue
    const normalized = normalizeTareaOrRoutine(t)
    if (normalized.kind === 'routine') {
      hasAnyRoutines = true
      if (hideRoutines) continue
    }
    byId.set(normalized.idActividad, normalized)
  }

  for (const e of eventosRaw) {
    if (!e || e.idActividad == null) continue
    const normalized = normalizeEvento(e)
    byId.set(normalized.idActividad, normalized)
  }

  const merged = Array.from(byId.values())

  merged.sort((a, b) => {
    const isoA = a.fechaInicio || `${a.date}T00:00:00`
    const isoB = b.fechaInicio || `${b.date}T00:00:00`
    const cmpDate = a.date.localeCompare(b.date)
    if (cmpDate !== 0) return cmpDate
    const cmpStart = a.start - b.start
    if (cmpStart !== 0) return cmpStart
    const cmpIso = String(isoA).localeCompare(String(isoB))
    if (cmpIso !== 0) return cmpIso
    return (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9)
  })

  return {
    items: merged,
    hasAnyRoutines,
  }
}
