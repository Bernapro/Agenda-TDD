import { IconCheck } from '../../../shared/components/icons'
import { minutesToTime } from '../../../shared/utils/isoDateFormatter'
import { TagPillList } from '../../tags/components/TagPill'

const PRIORITY_LABELS = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
}

export function TaskRow({ item, onToggle }) {
  const limitLabel = item.limitTime || minutesToTime(item.start)
  const priorityLabel = item.prioridad ? PRIORITY_LABELS[item.prioridad] || item.prioridad : null

  return (
    <article className="flex items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 transition-colors hover:border-line hover:bg-surface">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? `Marcar "${item.title}" como pendiente` : `Completar "${item.title}"`}
        onClick={() => onToggle(item)}
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

      <TagPillList etiquetas={item.etiquetas} />
    </article>
  )
}
