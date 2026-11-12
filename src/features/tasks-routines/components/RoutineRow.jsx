import { IconFlame, IconPencil, IconRepeat } from '../../../shared/components/icons'
import { TagPillList } from '../../tags/components/TagPill'
import { calcularDiasDesdeInicio } from '../utils/routineDaysCalculator'

export function RoutineRow({ item, onOpenDetail, onEdit }) {
  const dias = item.dias !== undefined ? item.dias : calcularDiasDesdeInicio(item.fechaInicio)
  const repeatText = item.repeatLabel || 'Rutina'

  return (
    <article
      onDoubleClick={() => onOpenDetail?.(item)}
      title="Doble clic para ver el detalle"
      className="group flex cursor-pointer items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 transition-colors hover:border-line hover:bg-surface"
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-routine/10 text-routine">
        <IconRepeat size={11} strokeWidth={2.25} />
      </span>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-[15px] text-ink">{item.title}</h4>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex h-5 items-center gap-1 rounded-full bg-routine/10 px-2 text-[11.5px] font-medium text-routine">
            Hábito · {repeatText}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft">
            <IconFlame size={12} />
            <span className="tabular-nums">{dias}</span> {dias === 1 ? 'día' : 'días'}
          </span>
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
            title="Editar rutina"
            className="grid h-7 w-7 place-items-center rounded-lg border border-transparent text-ink-soft opacity-0 transition-all group-hover:opacity-100 hover:border-line hover:bg-canvas hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            <IconPencil size={13.5} />
          </button>
        )}
      </div>
    </article>
  )
}
