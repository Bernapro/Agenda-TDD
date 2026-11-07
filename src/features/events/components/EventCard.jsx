import { IconClock, IconMapPin, IconUsers } from '../../../shared/components/icons'
import { formatDuration, minutesToTime } from '../../agenda-board/utils/dateRangeCalculator'
import { TagPillList } from '../../tags/components/TagPill'

function Meta({ children }) {
  return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft">{children}</span>
}

export function EventCard({ item }) {
  const borderColor = item.hexColor?.trim() || 'var(--color-event)'
  const direccion = item.direccion || item.location || ''
  const invitados = Number(item.cantidadInvitados ?? item.guests ?? 0)
  const durationMins = Math.max(0, (item.end ?? item.start) - item.start)

  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface py-3.5 pr-4 pl-5 shadow-whisper transition-shadow hover:shadow-float">
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: borderColor }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-[11px] font-medium tracking-[0.06em] text-event uppercase">EVENTO</p>
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
        <TagPillList etiquetas={item.etiquetas} />
      </div>
    </article>
  )
}
