import { useMemo } from 'react'
import { sanitizeHexColor } from '../../../shared/api/httpClient'
import { IconCheck, IconPencil, IconPlus, IconRepeat, IconSun } from '../../../shared/components/icons'
import { useIntersectionObserver } from '../../../shared/hooks/useIntersectionObserver'
import {
  buildWeekSpanLayout,
  buildWeeksForMonthRange,
  buildWeeksForWeekRange,
} from '../utils/calendarSpanLayout'
import {
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  capitalize,
  isSameDay,
  minutesToTime,
  pad2,
} from '../utils/dateRangeCalculator'

function WeekdayHeader({ compact = false }) {
  return (
    <div className="grid grid-cols-7 border-b border-line bg-panel/60">
      {WEEKDAYS_SHORT.map((dayName) => (
        <div
          key={dayName}
          className={`text-center font-medium tracking-[0.08em] text-ink-soft uppercase ${
            compact ? 'py-1.5 text-[10px]' : 'py-2.5 text-[11px]'
          }`}
        >
          {dayName}
        </div>
      ))}
    </div>
  )
}

function ActivitySpanBar({
  segment,
  compact = false,
  onOpenItemDetail,
  onEditItem,
  onToggleTask,
}) {
  const { item, startCol, spanCols, laneIndex, continuesLeft, continuesRight, totalDays } = segment
  const color = sanitizeHexColor(item.hexColor, '#3B82F6')
  const isTask = item.kind === 'task'
  const isRoutine = item.kind === 'routine'

  const roundedLeft = continuesLeft ? 'rounded-l-none' : 'rounded-l-md'
  const roundedRight = continuesRight ? 'rounded-r-none' : 'rounded-r-md'

  const timeLabel =
    item.todoElDia
      ? 'Todo el día'
      : `${minutesToTime(item.start)} – ${minutesToTime(item.end)}`

  const tooltip = `${item.title} (${timeLabel}${totalDays > 1 ? ` · ${totalDays} días` : ''}) — Doble clic para ver detalle`

  return (
    <div
      role="button"
      tabIndex={0}
      title={tooltip}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpenItemDetail?.(item)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenItemDetail?.(item)
        }
      }}
      style={{
        gridColumn: `${startCol + 1} / span ${spanCols}`,
        gridRow: laneIndex + 1,
        backgroundColor: `${color}1F`,
        borderLeft: continuesLeft ? 'none' : `3.5px solid ${color}`,
        borderBottom: `2px solid ${color}`,
      }}
      className={`group relative z-10 flex cursor-pointer items-center gap-1.5 overflow-hidden transition-all select-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${roundedLeft} ${roundedRight} ${
        compact ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2.5 text-[12px]'
      } font-medium`}
    >
      {continuesLeft && (
        <span className="shrink-0 font-mono text-[10px] opacity-75" style={{ color }}>
          ←
        </span>
      )}

      {isTask ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleTask?.(item)
          }}
          aria-label={item.done ? `Marcar "${item.title}" como pendiente` : `Completar "${item.title}"`}
          style={{
            borderColor: color,
            backgroundColor: item.done ? color : 'transparent',
          }}
          className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border text-white transition-transform hover:scale-110"
        >
          {item.done && <IconCheck size={9} strokeWidth={3} />}
        </button>
      ) : isRoutine ? (
        <IconRepeat size={11} className="shrink-0" style={{ color }} />
      ) : (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}

      {!item.todoElDia && !continuesLeft && !compact && (
        <span className="shrink-0 font-mono text-[11px] text-ink-soft tabular-nums opacity-85">
          {minutesToTime(item.start)}
        </span>
      )}

      <span className={`min-w-0 flex-1 truncate font-medium text-ink ${item.done ? 'line-through opacity-60' : ''}`}>
        {item.title}
      </span>

      {totalDays > 1 && spanCols >= 2 && !compact && (
        <span
          className="shrink-0 rounded px-1 py-0.2 font-mono text-[10px] font-semibold opacity-80"
          style={{ color }}
        >
          {totalDays}d
        </span>
      )}

      {continuesRight && (
        <span className="shrink-0 font-mono text-[10px] opacity-75" style={{ color }}>
          →
        </span>
      )}

      {onEditItem && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEditItem(item)
          }}
          aria-label={`Editar ${item.title}`}
          title="Editar actividad"
          className="ml-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-surface/85 text-ink-soft opacity-0 shadow-whisper transition-opacity group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
        >
          <IconPencil size={11} />
        </button>
      )}
    </div>
  )
}

function WeekHorizontalRow({
  weekDays,
  items,
  today,
  minHeightClass = 'min-h-[132px]',
  compact = false,
  onOpenDay,
  onOpenItemDetail,
  onEditItem,
  onToggleTask,
}) {
  const { days, segments } = useMemo(
    () => buildWeekSpanLayout(weekDays, items),
    [weekDays, items],
  )

  return (
    <div className={`relative border-b border-line last:border-b-0 ${minHeightClass}`}>
      {/* Columnas verticales de fondo para los 7 días */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-7 divide-x divide-line/70">
        {days.map((d) => {
          const isToday = isSameDay(d.date, today)
          return (
            <div
              key={d.dateKey}
              className={`${
                !d.inMonth
                  ? 'bg-panel/35'
                  : isToday
                    ? 'bg-accent-soft/25'
                    : 'bg-surface'
              }`}
            />
          )
        })}
      </div>

      {/* Cabecera numérica de cada día de la semana */}
      <div className="relative z-10 grid grid-cols-7">
        {days.map((d) => {
          const isToday = isSameDay(d.date, today)
          const isFirstOfMonth = d.date.getDate() === 1
          return (
            <div key={d.dateKey} className={compact ? 'px-1.5 pt-1.5 pb-1' : 'px-2.5 pt-2 pb-1.5'}>
              <button
                type="button"
                onClick={() => onOpenDay?.(d.date)}
                title={`Ir al día ${pad2(d.date.getDate())} ${MONTHS_SHORT[d.date.getMonth()]}`}
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                  compact ? 'text-[11px]' : 'text-[12.5px]'
                } ${
                  isToday
                    ? 'bg-accent font-semibold text-white'
                    : d.inMonth
                      ? 'text-ink hover:bg-panel'
                      : 'text-ink-faint hover:bg-panel'
                }`}
              >
                <span>{pad2(d.date.getDate())}</span>
                {isFirstOfMonth && !compact && (
                  <span className={`font-sans text-[11px] ${isToday ? 'text-white/90' : 'text-ink-soft'}`}>
                    {MONTHS_SHORT[d.date.getMonth()]}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Carriles horizontales con barras continuas multi-día */}
      {segments.length > 0 && (
        <div
          className={`relative z-10 grid grid-cols-7 gap-x-1 ${
            compact ? 'gap-y-1 px-1 pb-2' : 'gap-y-1.5 px-1.5 pb-3.5'
          }`}
        >
          {segments.map((seg) => (
            <ActivitySpanBar
              key={seg.id}
              segment={seg}
              compact={compact}
              onOpenItemDetail={onOpenItemDetail}
              onEditItem={onEditItem}
              onToggleTask={onToggleTask}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function HorizontalCalendarBoard({
  occurrences = [],
  range,
  activeDate,
  today,
  routinesHidden = false,
  loadingInitial = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onToggleTask,
  onOpenDay,
  onCreate,
  onOpenItemDetail,
  onEditItem,
}) {
  const sentinelRef = useIntersectionObserver({
    onIntersect: () => onLoadMore?.(),
    enabled: Boolean(hasMore && onLoadMore && !loadingInitial),
    rootMargin: '200px',
  })

  if (loadingInitial && occurrences.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-full bg-panel text-ink-soft">
          <IconSun size={22} />
        </span>
        <p className="mt-4 text-[13.5px] text-ink-soft">Cargando calendario horizontal…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Leyenda e indicación rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-soft">
        <p>
          Las barras horizontales abarcan todos los días de duración de cada actividad.{' '}
          <span className="text-ink-faint">Haz doble clic en una barra para consultar o editar.</span>
        </p>
        {occurrences.length === 0 && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium text-accent transition-colors hover:bg-accent-soft"
          >
            <IconPlus size={14} strokeWidth={2.25} />
            Nueva actividad
          </button>
        )}
      </div>

      {range === 'week' && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-whisper">
          <WeekdayHeader />
          {buildWeeksForWeekRange(activeDate).map((weekDays) => (
            <WeekHorizontalRow
              key={weekDays[0].dateKey}
              weekDays={weekDays}
              items={occurrences}
              today={today}
              minHeightClass="min-h-[420px]"
              onOpenDay={onOpenDay}
              onOpenItemDetail={onOpenItemDetail}
              onEditItem={onEditItem}
              onToggleTask={onToggleTask}
            />
          ))}
        </div>
      )}

      {range === 'month' && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-whisper">
          <WeekdayHeader />
          {buildWeeksForMonthRange(activeDate.getFullYear(), activeDate.getMonth()).map((weekDays) => (
            <WeekHorizontalRow
              key={weekDays[0].dateKey}
              weekDays={weekDays}
              items={occurrences}
              today={today}
              minHeightClass="min-h-[136px]"
              onOpenDay={onOpenDay}
              onOpenItemDetail={onOpenItemDetail}
              onEditItem={onEditItem}
              onToggleTask={onToggleTask}
            />
          ))}
        </div>
      )}

      {range === 'year' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {MONTHS.map((monthName, monthIndex) => {
            const year = activeDate.getFullYear()
            const monthWeeks = buildWeeksForMonthRange(year, monthIndex)
            return (
              <section
                key={monthName}
                aria-label={`${monthName} ${year}`}
                className="overflow-hidden rounded-2xl border border-line bg-surface shadow-whisper"
              >
                <div className="flex items-center justify-between border-b border-line bg-panel/40 px-4 py-2.5">
                  <h3 className="font-display text-[14px] font-semibold text-ink">
                    {capitalize(monthName)}
                  </h3>
                  <span className="font-mono text-[11.5px] text-ink-faint">{year}</span>
                </div>
                <WeekdayHeader compact />
                {monthWeeks.map((weekDays) => (
                  <WeekHorizontalRow
                    key={weekDays[0].dateKey}
                    weekDays={weekDays}
                    items={occurrences}
                    today={today}
                    minHeightClass="min-h-[76px]"
                    compact
                    onOpenDay={onOpenDay}
                    onOpenItemDetail={onOpenItemDetail}
                    onEditItem={onEditItem}
                    onToggleTask={onToggleTask}
                  />
                ))}
              </section>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="py-2 text-center text-[12.5px] text-ink-faint">
          {loadingMore ? 'Cargando más actividades del periodo…' : ''}
        </div>
      )}

      {routinesHidden && (
        <p className="text-[12.5px] text-ink-faint">
          Las rutinas recurrentes se ocultan en las vistas de mes y año para mantener la claridad.
        </p>
      )}
    </div>
  )
}
