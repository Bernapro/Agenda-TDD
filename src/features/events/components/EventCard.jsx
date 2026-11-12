import { IconClock, IconMapPin, IconPencil, IconUsers } from '../../../shared/components/icons'
import { MONTHS_SHORT, formatDuration, fromKey, minutesToTime, pad2 } from '../../agenda-board/utils/dateRangeCalculator'
import { TagPillList } from '../../tags/components/TagPill'

function Meta({ children }) {
  return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft">{children}</span>
}

function formatShortDate(dateKey) {
  if (!dateKey) return ''
  const d = fromKey(dateKey)
  return `${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`
}

export function EventCard({ item, onOpenDetail, onEdit }) {
  const borderColor = item.hexColor?.trim() || 'var(--color-event)'
  const direccion = item.direccion || item.location || ''
  const invitados = Number(item.cantidadInvitados ?? item.guests ?? 0)
  const isMultiDay = Boolean(item.endDate && item.endDate > item.date)
  const durationMins = !isMultiDay ? Math.max(0, (item.end ?? item.start) - item.start) : 0

  return (
    <article
      onDoubleClick={() => onOpenDetail?.(item)}
      title="Doble clic para ver el detalle"
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-line bg-surface py-3.5 pr-4 pl-5 shadow-whisper transition-shadow hover:shadow-float"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: borderColor }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-[11px] font-medium tracking-[0.06em] text-event uppercase">EVENTO</p>
            {isMultiDay && (
              <span className="rounded-full bg-panel px-2 py-0.5 font-mono text-[10.5px] text-ink-soft">
                {formatShortDate(item.date)} → {formatShortDate(item.endDate)}
              </span>
            )}
          </div>
          <h4 className="truncate text-[15px] font-medium text-ink">{item.title}</h4>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Meta>
              <IconClock size={13} />
              {item.todoElDia ? (
                <span>Todo el día</span>
              ) : (
                <>
                  <span className="tabular-nums">
                    {minutesToTime(item.start)} – {minutesToTime(item.end)}
                  </span>
                  {durationMins > 0 && <span className="text-ink-faint">· {formatDuration(durationMins)}</span>}
                </>
              )}
            </Meta>
            {direccion && (
              <Meta>
                <IconMapPin size={13} />
                <span>{direccion}</span>
              </Meta>
            )}
            {invitados > 0 && (
              <Meta>
                <IconUsers size={13} />
                <span className="tabular-nums">{invitados}</span> {invitados === 1 ? 'invitado' : 'invitados'}
              </Meta>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TagPillList etiquetas={item.etiquetas} />
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(item)
              }}
              aria-label={`Editar ${item.title}`}
              title="Editar actividad"
              className="grid h-7 w-7 place-items-center rounded-lg border border-transparent text-ink-soft opacity-0 transition-all group-hover:opacity-100 hover:border-line hover:bg-canvas hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
            >
              <IconPencil size={13.5} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
