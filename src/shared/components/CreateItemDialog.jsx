import { useState } from 'react'
import { DB_WEEKDAY_CODES, WEEKDAYS, fromKey, minutesToTime, timeToMinutes, toKey } from '../../features/agenda-board/utils/dateRangeCalculator'
import { ContactSearchSelect } from '../../features/events/components/ContactSearchSelect'
import { useCreateEvent } from '../../features/events/hooks/useCreateEvent'
import { TagSearchInput } from '../../features/tags/components/TagSearchInput'
import { useCreateTaskOrRoutine } from '../../features/tasks-routines/hooks/useCreateTaskOrRoutine'
import { normalizeTagNameForDb, sanitizeHexColor } from '../api/httpClient'
import { combineDateAndTimeISO } from '../utils/isoDateFormatter'
import { Dialog, DialogHeader } from './Dialog'
import { KIND_META } from './icons'
import { RecurrenceFields } from './RecurrenceFields'
import { RemindersListInput } from './RemindersListInput'

const inputCls =
  'h-10 w-full rounded-lg border border-line bg-canvas px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/50 focus:bg-surface focus:ring-2 focus:ring-accent/15'

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[12px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

export function CreateItemDialog({
  initialKind = 'event',
  defaultDate,
  defaultStart = 9 * 60,
  availableTags = [],
  onClose,
  onSuccess,
}) {
  const [kind, setKind] = useState(initialKind)
  const [title, setTitle] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [date, setDate] = useState(() => toKey(defaultDate))
  const [endDate, setEndDate] = useState(() => toKey(defaultDate))
  const [start, setStart] = useState(() => minutesToTime(defaultStart))
  const [end, setEnd] = useState(() => minutesToTime(Math.min(defaultStart + 60, 23 * 60 + 45)))
  const [limitDate, setLimitDate] = useState(() => toKey(defaultDate))
  const [limitTime, setLimitTime] = useState(() => minutesToTime(Math.min(defaultStart + 60, 23 * 60 + 59)))

  // Campos de Tarea
  const [prioridad, setPrioridad] = useState('MEDIA')
  const [estadoTarea, setEstadoTarea] = useState('PENDIENTE')

  // Campos de Evento
  const [direccion, setDireccion] = useState('')
  const [todoElDia, setTodoElDia] = useState(false)
  const [contactosEventos, setContactosEventos] = useState([])

  // Campos de Rutina (3 píldoras del Figma)
  const [repeat, setRepeat] = useState('daily')

  // Recurrencia opcional (Eventos / Tareas) y Recordatorios
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [recurrenceConfig, setRecurrenceConfig] = useState(null)
  const [recordatorios, setRecordatorios] = useState([])

  // Etiquetas y Color: el formulario inicia sin etiquetas; solo se muestran las que el usuario añade
  const [selectedTags, setSelectedTags] = useState([])
  const [hexColor, setHexColor] = useState(() => KIND_META[initialKind]?.defaultHex || '#3B82F6')
  const [validationError, setValidationError] = useState(null)

  const { createEvent, submitting: submittingEvent, error: eventError, clearError: clearEventError } = useCreateEvent()
  const {
    createTaskOrRoutine,
    submitting: submittingTask,
    error: taskError,
    clearError: clearTaskError,
  } = useCreateTaskOrRoutine()

  const weekdayIndex = fromKey(date).getDay()
  const weekdayName = WEEKDAYS[weekdayIndex]
  const weekdayCode = DB_WEEKDAY_CODES[weekdayIndex]
  const meta = KIND_META[kind]

  const handleKindSwitch = (nextKind) => {
    setKind(nextKind)
    setValidationError(null)
    clearEventError()
    clearTaskError()
    setHexColor(KIND_META[nextKind]?.defaultHex || '#3B82F6')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError(null)
    clearEventError()
    clearTaskError()

    const cleanTitle = title.trim() || `Nuevo ${meta.label.toLowerCase()}`
    if (cleanTitle.length > 150) {
      setValidationError('El título de la actividad no puede exceder 150 caracteres.')
      return
    }

    const validHex = sanitizeHexColor(hexColor, KIND_META[kind].defaultHex)
    const startMin = timeToMinutes(start)
    const endMin = timeToMinutes(end)

    if (!todoElDia && endMin < startMin && (kind !== 'event' || endDate === date)) {
      setValidationError('La hora de fin debe ser igual o posterior a la hora de inicio.')
      return
    }

    const etiquetasPayload = selectedTags
      .map((t) => ({
        nombre: normalizeTagNameForDb(t.nombre || t.label),
        hexColor: sanitizeHexColor(t.hexColor, validHex),
      }))
      .filter((t) => t.nombre)
    const recordatoriosPayload = recordatorios.map((r) => ({
      tiempoAnticipacion: Math.max(0, Number(r.tiempoAnticipacion) || 0),
      unidadTiempo: r.unidadTiempo || 'MINUTOS',
    }))

    try {
      if (kind === 'event') {
        if (direccion.trim().length > 255) {
          setValidationError('La dirección o ubicación no puede exceder 255 caracteres.')
          return
        }

        const effectiveEndDate = endDate && endDate >= date ? endDate : date
        const fechaInicioISO = todoElDia
          ? `${date}T00:00:00`
          : combineDateAndTimeISO(date, start, '00')
        const fechaFinISO = todoElDia
          ? `${effectiveEndDate}T23:59:00`
          : combineDateAndTimeISO(effectiveEndDate, end, '00')

        if (fechaFinISO < fechaInicioISO) {
          setValidationError('La fecha y hora de fin no puede ser anterior al inicio.')
          return
        }

        const recurrenciaPayload =
          recurrenceEnabled && recurrenceConfig
            ? {
                frecuencia: recurrenceConfig.frecuencia || 'SEMANAL',
                intervalo: Math.max(1, Number(recurrenceConfig.intervalo) || 1),
                diasSemana:
                  recurrenceConfig.frecuencia === 'SEMANAL'
                    ? String(recurrenceConfig.diasSemana || weekdayCode).slice(0, 20)
                    : null,
                diaMes:
                  recurrenceConfig.frecuencia === 'MENSUAL' || recurrenceConfig.frecuencia === 'ANUAL'
                    ? Number(recurrenceConfig.diaMes) || fromKey(date).getDate()
                    : null,
                mesAnio:
                  recurrenceConfig.frecuencia === 'ANUAL'
                    ? Number(recurrenceConfig.mesAnio) || fromKey(date).getMonth() + 1
                    : null,
                fechaInicio: date,
                fechaFin: recurrenceConfig.fechaFin || null,
              }
            : null

        const seenContacts = new Set()
        const uniqueContactosEventos = contactosEventos
          .filter((ce) => {
            if (!ce.idContacto || seenContacts.has(ce.idContacto)) return false
            seenContacts.add(ce.idContacto)
            return true
          })
          .map((ce) => ({
            idContacto: ce.idContacto,
            notaParticipacion: (ce.notaParticipacion || 'Invitado').trim(),
          }))

        const eventoPayload = {
          actividad: {
            titulo: cleanTitle,
            descripcion: descripcion.trim() || null,
            hexColor: validHex,
            fechaInicio: fechaInicioISO,
            fechaFin: fechaFinISO,
            tipoActividad: 'EVENTO',
            recurrencia: recurrenciaPayload,
            recordatorios: recordatoriosPayload,
            etiquetas: etiquetasPayload,
            notas: [],
          },
          direccion: direccion.trim() || null,
          todoElDia: Boolean(todoElDia),
          recordatorios: [],
          contactosEventos: uniqueContactosEventos,
        }

        await createEvent(eventoPayload)
        onSuccess?.({ kind: 'event', dateKey: date })
        onClose()
      } else if (kind === 'task') {
        const fechaInicioISO = combineDateAndTimeISO(date, start, '00')
        const fechaFinISO = combineDateAndTimeISO(date, end, '00')
        const effectiveLimitDate = limitDate || date
        const fechaLimiteISO = combineDateAndTimeISO(effectiveLimitDate, limitTime, '00')

        if (fechaLimiteISO < fechaInicioISO) {
          setValidationError('La fecha límite de la tarea debe ser igual o posterior a la fecha y hora de inicio.')
          return
        }

        const recurrenciaPayload =
          recurrenceEnabled && recurrenceConfig
            ? {
                frecuencia: recurrenceConfig.frecuencia || 'DIARIA',
                intervalo: Math.max(1, Number(recurrenceConfig.intervalo) || 1),
                diasSemana:
                  recurrenceConfig.frecuencia === 'SEMANAL'
                    ? String(recurrenceConfig.diasSemana || weekdayCode).slice(0, 20)
                    : null,
                diaMes:
                  recurrenceConfig.frecuencia === 'MENSUAL' || recurrenceConfig.frecuencia === 'ANUAL'
                    ? Number(recurrenceConfig.diaMes) || fromKey(date).getDate()
                    : null,
                mesAnio:
                  recurrenceConfig.frecuencia === 'ANUAL'
                    ? Number(recurrenceConfig.mesAnio) || fromKey(date).getMonth() + 1
                    : null,
                fechaInicio: date,
                fechaFin: recurrenceConfig.fechaFin || null,
              }
            : null

        const tareaPayload = {
          actividad: {
            titulo: cleanTitle,
            descripcion: descripcion.trim() || null,
            hexColor: validHex,
            fechaInicio: fechaInicioISO,
            fechaFin: fechaFinISO,
            tipoActividad: 'TAREA',
            recurrencia: recurrenciaPayload,
            recordatorios: recordatoriosPayload,
            etiquetas: etiquetasPayload,
            notas: [],
          },
          fechaLimite: fechaLimiteISO,
          estado: estadoTarea,
          prioridad,
          idTareaPadre: null,
        }

        await createTaskOrRoutine(tareaPayload)
        onSuccess?.({ kind: 'task', dateKey: date })
        onClose()
      } else {
        // RUTINA: POST /agenda/tareas con fechaLimite: null y bloque de recurrencia según las 3 píldoras del Figma
        const fechaInicioISO = combineDateAndTimeISO(date, start, '00')
        const fechaFinISO = combineDateAndTimeISO(date, end, '00')

        const routineRecurrenceMap = {
          daily: {
            frecuencia: 'DIARIA',
            intervalo: 1,
            diasSemana: null,
            diaMes: null,
            mesAnio: null,
            fechaInicio: date,
            fechaFin: null,
          },
          weekdays: {
            frecuencia: 'SEMANAL',
            intervalo: 1,
            diasSemana: 'LUN,MAR,MIE,JUE,VIE',
            diaMes: null,
            mesAnio: null,
            fechaInicio: date,
            fechaFin: null,
          },
          weekly: {
            frecuencia: 'SEMANAL',
            intervalo: 1,
            diasSemana: weekdayCode,
            diaMes: null,
            mesAnio: null,
            fechaInicio: date,
            fechaFin: null,
          },
        }

        const rutinaPayload = {
          actividad: {
            titulo: cleanTitle,
            descripcion: descripcion.trim() || null,
            hexColor: validHex,
            fechaInicio: fechaInicioISO,
            fechaFin: fechaFinISO,
            tipoActividad: 'TAREA',
            recurrencia: routineRecurrenceMap[repeat] || routineRecurrenceMap.daily,
            recordatorios: recordatoriosPayload,
            etiquetas: etiquetasPayload,
            notas: [],
          },
          fechaLimite: null,
          estado: 'PENDIENTE',
          prioridad: 'MEDIA',
          idTareaPadre: null,
        }

        await createTaskOrRoutine(rutinaPayload)
        onSuccess?.({ kind: 'routine', dateKey: date })
        onClose()
      }
    } catch {
      // El hook correspondiente expone el mensaje exacto de ErrorDetalles
    }
  }

  const activeError = validationError || eventError || taskError
  const isSubmitting = submittingEvent || submittingTask

  return (
    <Dialog onClose={onClose} labelledBy="create-title" width="max-w-[520px]">
      <DialogHeader id="create-title" title={`Crear ${meta.label.toLowerCase()}`} subtitle={meta.description} onClose={onClose} />

      <form onSubmit={handleSubmit} className="scrollbar-subtle max-h-[80vh] space-y-4 overflow-y-auto px-6 py-5">
        <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-3 gap-1 rounded-lg bg-panel p-1">
          {Object.keys(KIND_META).map((k) => {
            const { label, Icon } = KIND_META[k]
            const active = k === kind
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleKindSwitch(k)}
                className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                  active ? 'bg-surface font-medium text-ink shadow-whisper' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Icon size={14} className={active ? { event: 'text-event', task: 'text-task', routine: 'text-routine' }[k] : ''} />
                {label}
              </button>
            )
          })}
        </div>

        {activeError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
            {activeError}
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Título">
            <input
              autoFocus
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={{ event: 'Ej. Reunión con el equipo', task: 'Ej. Enviar factura', routine: 'Ej. Leer 20 minutos' }[kind]}
              className={inputCls}
            />
          </Field>

          <Field label="Color">
            <input
              type="color"
              value={sanitizeHexColor(hexColor)}
              onChange={(e) => setHexColor(e.target.value.toUpperCase())}
              aria-label="Color hexadecimal"
              className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-canvas p-1"
            />
          </Field>
        </div>

        <Field label="Descripción (opcional)">
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Contexto breve o enlace..."
            className={inputCls}
          />
        </Field>

        {/* Horario según tipo */}
        <div className="grid grid-cols-3 gap-3">
          <Field label={kind === 'routine' ? 'Empieza el' : kind === 'task' ? 'Fecha programada' : 'Fecha'}>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => {
                const nextDate = e.target.value
                setDate(nextDate)
                if (endDate < nextDate) setEndDate(nextDate)
                if (limitDate < nextDate) setLimitDate(nextDate)
              }}
              className={`${inputCls} tabular-nums`}
            />
          </Field>

          <Field label="Hora de inicio">
            <input
              type="time"
              required
              disabled={kind === 'event' && todoElDia}
              value={start}
              onChange={(e) => {
                const nextStart = e.target.value
                setStart(nextStart)
                if (timeToMinutes(end) < timeToMinutes(nextStart)) {
                  setEnd(minutesToTime(Math.min(timeToMinutes(nextStart) + 30, 23 * 60 + 59)))
                }
                if (limitDate === date && timeToMinutes(limitTime) < timeToMinutes(nextStart)) {
                  setLimitTime(minutesToTime(Math.min(timeToMinutes(nextStart) + 60, 23 * 60 + 59)))
                }
              }}
              className={`${inputCls} tabular-nums disabled:opacity-50`}
            />
          </Field>

          <Field label="Hora de fin">
            <input
              type="time"
              required
              disabled={kind === 'event' && todoElDia}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={`${inputCls} tabular-nums disabled:opacity-50`}
            />
          </Field>
        </div>

        {/* Campos exclusivos de TAREA */}
        {kind === 'task' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha límite">
                <input
                  type="date"
                  required
                  min={date}
                  value={limitDate}
                  onChange={(e) => setLimitDate(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
              </Field>
              <Field label="Hora límite">
                <input
                  type="time"
                  required
                  value={limitTime}
                  onChange={(e) => setLimitTime(e.target.value)}
                  className={`${inputCls} tabular-nums`}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prioridad">
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={inputCls}>
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </Field>
              <Field label="Estado">
                <select value={estadoTarea} onChange={(e) => setEstadoTarea(e.target.value)} className={inputCls}>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="EN_PROGRESO">En progreso</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </Field>
            </div>
          </>
        )}

        {/* Campos exclusivos de EVENTO */}
        {kind === 'event' && (
          <>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <Field label="Ubicación">
                <input
                  maxLength={255}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Sala, dirección o enlace"
                  className={inputCls}
                />
              </Field>
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-[13px] text-ink-soft select-none hover:text-ink">
                <input
                  type="checkbox"
                  checked={todoElDia}
                  onChange={(e) => setTodoElDia(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Todo el día
              </label>
            </div>

            <Field label="Participantes (contactos)">
              <ContactSearchSelect value={contactosEventos} onChange={setContactosEventos} />
            </Field>
          </>
        )}

        {/* Campos exclusivos de RUTINA (3 píldoras del Figma) */}
        {kind === 'routine' && (
          <fieldset>
            <legend className="mb-1.5 text-[12px] font-medium text-ink-soft">Repetición</legend>
            <div className="flex flex-wrap gap-2">
              {[
                ['daily', 'Diario'],
                ['weekdays', 'Días laborables'],
                ['weekly', `Cada ${weekdayName}`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={repeat === value}
                  onClick={() => setRepeat(value)}
                  className={`h-8 rounded-full border px-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:ring-routine/30 focus-visible:outline-none ${
                    repeat === value
                      ? 'border-routine/40 bg-routine/10 font-medium text-routine'
                      : 'border-line text-ink-soft hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {/* Recurrencia opcional para Eventos y Tareas */}
        {kind !== 'routine' && (
          <RecurrenceFields
            enabled={recurrenceEnabled}
            onToggleEnabled={setRecurrenceEnabled}
            value={recurrenceConfig}
            onChange={setRecurrenceConfig}
            baseDate={date}
          />
        )}

        {/* Recordatorios dinámicos */}
        <RemindersListInput value={recordatorios} onChange={setRecordatorios} />

        {/* Etiquetas: buscador con sugerencias; solo se muestran las etiquetas seleccionadas */}
        <fieldset>
          <legend className="mb-1.5 text-[12px] font-medium text-ink-soft">Etiquetas</legend>
          <TagSearchInput
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            availableTags={availableTags}
            defaultColor={sanitizeHexColor(hexColor, KIND_META[kind].defaultHex)}
            onSelectColor={(hex) => setHexColor(sanitizeHexColor(hex, hexColor))}
            tone="canvas"
          />
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg px-4 text-[14px] text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-lg bg-accent px-4 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando…' : `Crear ${meta.label.toLowerCase()}`}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
