import { IconCheck, IconPencil } from '../../../shared/components/icons'
import { minutesToTime } from '../../../shared/utils/isoDateFormatter'
import { MONTHS_SHORT, fromKey, pad2 } from '../../agenda-board/utils/dateRangeCalculator'
import { TagPillList } from '../../tags/components/TagPill'

const PRIORITY_LABELS = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
}

function formatShortDate(dateKey) {
  if (!dateKey) return ''
  const d = fromKey(dateKey)
  return `${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`
}

export function TaskRow({ item, onToggle, onOpenDetail, onEdit }) {
  const limitLabel = item.limitTime || minutesToTime(item.start)
  const priorityLabel = item.prioridad ? PRIORITY_LABELS[item.prioridad] || item.prioridad : null
  const isMultiDay = Boolean(item.endDate && item.endDate > item.date)

  return (
    <article
      onDoubleClick={() => onOpenDetail?.(item)}
      title="Doble clic para ver el detalle"
      className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 transition-colors hover:border-line hover:bg-surface"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? `Marcar "${item.title}" como pendiente` : `Completar "${item.title}"`}
        onClick={(e) => {
          e.stopPropagation()
          onToggle(item)
        }}
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors focus-visible:ring-2 focus-visible:ring-task/30 focus-visible:outline-none ${
          item.done ? 'border-task bg-task text-white' : 'border-task/60 hover:bg-task/10'
        }`}
      >
        {item.done && <IconCheck size={12} strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <h4 className={`truncate text-[15px] transition-colors ${item.done ? 'text-ink-faint line-through' : 'text-ink'}`}>
          {item.title}
        </h4>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          <span className="text-task">Tarea</span>
          {isMultiDay && (
            <>
              <span className="text-ink-faint"> · </span>
              <span className="font-mono text-[11.5px]">
                {formatShortDate(item.date)} → {formatShortDate(item.endDate)}
              </span>
            </>
          )}
          <span className="text-ink-faint"> · </span>
          {item.done ? (
            'Completada'
          ) : (
            <>
              Límite <span className="tabular-nums">{limitLabel}</span>
              {priorityLabel && (
                <>
                  <span className="text-ink-faint"> · </span>
                  <span>{priorityLabel}</span>
                </>
              )}
            </>
          )}
        </p>
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
            title="Editar tarea"
            className="grid h-7 w-7 place-items-center rounded-lg border border-transparent text-ink-soft opacity-0 transition-all group-hover:opacity-100 hover:border-line hover:bg-canvas hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            <IconPencil size={13.5} />
          </button>
        )}
      </div>
    </article>
  )
}
