import { Fragment } from 'react'
import { IconPlus, IconSun } from '../../../shared/components/icons'
import { useIntersectionObserver } from '../../../shared/hooks/useIntersectionObserver'
import { EventCard } from '../../events/components/EventCard'
import { RoutineRow } from '../../tasks-routines/components/RoutineRow'
import { TaskRow } from '../../tasks-routines/components/TaskRow'
import { MONTHS_SHORT, WEEKDAYS_SHORT, fromKey, isSameDay, minutesToTime, pad2 } from '../utils/dateRangeCalculator'

function renderItem(item, onToggleTask, onOpenItemDetail, onEditItem) {
  switch (item.kind) {
    case 'event':
      return <EventCard item={item} onOpenDetail={onOpenItemDetail} onEdit={onEditItem} />
    case 'task':
      return <TaskRow item={item} onToggle={onToggleTask} onOpenDetail={onOpenItemDetail} onEdit={onEditItem} />
    case 'routine':
      return <RoutineRow item={item} onOpenDetail={onOpenItemDetail} onEdit={onEditItem} />
    default:
      return null
  }
}

function TimeRow({ time, children, accent = false }) {
  return (
    <li className="grid grid-cols-[64px_1fr] items-start gap-6">
      <time className={`pt-3.5 text-right font-mono text-[13px] ${accent ? 'text-accent' : 'text-ink-soft'}`}>
        {time}
      </time>
      <div className="min-w-0">{children}</div>
    </li>
  )
}

function NowMarker({ minutes }) {
  return (
    <li className="grid grid-cols-[64px_1fr] items-center gap-6" aria-label={`Ahora, ${minutesToTime(minutes)}`}>
      <span className="text-right font-mono text-[12px] text-accent">{minutesToTime(minutes)}</span>
      <span className="relative h-px bg-accent/35">
        <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-canvas" />
      </span>
    </li>
  )
}

function DayList({ items, nowMinutes, onToggleTask, onOpenItemDetail, onEditItem }) {
  let markerIndex = -1
  if (nowMinutes !== null && nowMinutes !== undefined) {
    const i = items.findIndex((it) => it.start > nowMinutes)
    markerIndex = i === -1 ? items.length : i
  }

  return (
    <ol className="space-y-3">
      {items.map((item, i) => {
        const showTime = i === 0 || items[i - 1].start !== item.start
        return (
          <Fragment key={item.id}>
            {i === markerIndex && <NowMarker minutes={nowMinutes} />}
            <TimeRow time={showTime ? minutesToTime(item.start) : null}>
              {renderItem(item, onToggleTask, onOpenItemDetail, onEditItem)}
            </TimeRow>
          </Fragment>
        )
      })}
      {markerIndex === items.length && <NowMarker minutes={nowMinutes} />}
    </ol>
  )
}

function EmptyState({ onCreate, range, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <span className="grid h-12 w-12 animate-pulse place-items-center rounded-full bg-panel text-ink-soft">
          <IconSun size={22} />
        </span>
        <p className="mt-4 text-[13.5px] text-ink-soft">Cargando actividades…</p>
      </div>
    )
  }

  const copy = { day: 'este día', week: 'esta semana', month: 'este mes', year: 'este año' }[range] || 'este periodo'
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-panel text-ink-soft">
        <IconSun size={22} />
      </span>
      <h3 className="mt-4 text-[16px] font-semibold text-ink">Nada programado para {copy}</h3>
      <p className="mt-1 max-w-[280px] text-[13.5px] text-ink-soft">Disfruta del espacio libre o planifica algo nuevo.</p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-[13.5px] font-medium text-accent transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      >
        <IconPlus size={15} strokeWidth={2.25} />
        crear evento
      </button>
    </div>
  )
}

export function TimelineTaskList({
  occurrences = [],
  range,
  activeDate,
  today,
  nowMinutes,
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
    rootMargin: '160px',
  })

  if (!occurrences.length) {
    return <EmptyState onCreate={onCreate} range={range} loading={loadingInitial} />
  }

  if (range === 'day') {
    return (
      <>
        <DayList
          items={occurrences}
          nowMinutes={isSameDay(activeDate, today) ? nowMinutes : null}
          onToggleTask={onToggleTask}
          onOpenItemDetail={onOpenItemDetail}
          onEditItem={onEditItem}
        />
        {hasMore && (
          <div ref={sentinelRef} className="py-4 text-center text-[12.5px] text-ink-faint">
            {loadingMore ? 'Cargando más actividades…' : ''}
          </div>
        )}
      </>
    )
  }

  const groups = new Map()
  for (const o of occurrences) {
    groups.set(o.date, [...(groups.get(o.date) ?? []), o])
  }

  return (
    <div className="space-y-10">
      {[...groups].map(([key, items]) => {
        const date = fromKey(key)
        const isToday = isSameDay(date, today)
        return (
          <section key={key} aria-label={key}>
            <button
              type="button"
              onClick={() => onOpenDay(date)}
              className="group mb-3 flex w-full items-baseline gap-3 border-b border-line pb-2 text-left focus-visible:outline-none"
            >
              <span className="w-[64px] text-right text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                {WEEKDAYS_SHORT[date.getDay()]}
              </span>
              <span className={`font-mono text-[18px] ${isToday ? 'text-accent' : 'text-ink'}`}>{pad2(date.getDate())}</span>
              <span className="text-[13px] text-ink-soft">
                {MONTHS_SHORT[date.getMonth()]} {date.getFullYear()}
              </span>
              {isToday && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Hoy</span>}
              <span className="ml-auto text-[12px] text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Ver día →
              </span>
            </button>
            <DayList
              items={items}
              nowMinutes={null}
              onToggleTask={onToggleTask}
              onOpenItemDetail={onOpenItemDetail}
              onEditItem={onEditItem}
            />
          </section>
        )
      })}

      {hasMore && (
        <div ref={sentinelRef} className="pl-[88px] text-[12.5px] text-ink-faint">
          {loadingMore ? 'Cargando más actividades…' : ''}
        </div>
      )}

      {routinesHidden && (
        <p className="pl-[88px] text-[12.5px] text-ink-faint">
          Las rutinas recurrentes se ocultan en las vistas de mes y año para mantener la claridad.
        </p>
      )}
    </div>
  )
}
