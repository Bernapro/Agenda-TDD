import { useMemo } from 'react'
import { IconChevronLeft, IconChevronRight } from '../../../shared/components/icons'
import { MONTHS, WEEKDAY_INITIALS, isSameDay, toKey } from '../../agenda-board/utils/dateRangeCalculator'
import { useMiniCalendar } from '../hooks/useMiniCalendar'

export function MiniMonthCalendar({ activeDate, today, range, onSelect, getMarkedKeys }) {
  const { view, weeks, shiftMonth, handleCellClick } = useMiniCalendar(activeDate, onSelect)

  const marked = useMemo(() => {
    if (!getMarkedKeys || !weeks.length) return new Set()
    const last = weeks[weeks.length - 1]
    return getMarkedKeys(weeks[0][0].date, last[last.length - 1].date, view)
  }, [weeks, getMarkedKeys, view])

  const activeWeekKey = range === 'week' ? toKey(activeDate) : null

  return (
    <section aria-label="Calendario mensual" className="rounded-xl border border-line bg-surface p-3 shadow-whisper">
      <header className="mb-2 flex items-center justify-between pl-1.5">
        <h3 className="text-[13.5px] font-medium text-ink" aria-live="polite">
          <span className="capitalize">{MONTHS[view.getMonth()]}</span>{' '}
          <span className="font-mono text-[12.5px] text-ink-soft">{view.getFullYear()}</span>
        </h3>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            <IconChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            <IconChevronRight size={15} />
          </button>
        </div>
      </header>

      <div role="grid" className="text-center">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAY_INITIALS.map((d, i) => (
            <span key={i} role="columnheader" className="grid h-7 place-items-center text-[11px] font-medium text-ink-faint">
              {d}
            </span>
          ))}
        </div>

        {weeks.map((week, wi) => {
          const inActiveWeek = activeWeekKey !== null && week.some((c) => toKey(c.date) === activeWeekKey)
          return (
            <div key={wi} role="row" className={`grid grid-cols-7 rounded-full ${inActiveWeek ? 'bg-accent-soft' : ''}`}>
              {week.map(({ date, inMonth }) => {
                const selected = isSameDay(date, activeDate)
                const isToday = isSameDay(date, today)
                const hasItems = marked.has(toKey(date))
                return (
                  <div key={toKey(date)} role="gridcell" className="grid place-items-center py-0.5">
                    <button
                      type="button"
                      onClick={() => handleCellClick(date, inMonth)}
                      aria-pressed={selected}
                      aria-label={date.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      className={`relative grid h-8 w-8 place-items-center rounded-full font-mono text-[12.5px] transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
                        selected
                          ? 'bg-accent text-white hover:bg-accent-hover'
                          : isToday
                            ? 'text-accent hover:bg-accent-soft'
                            : inMonth
                              ? 'text-ink hover:bg-panel'
                              : 'text-ink-faint hover:bg-panel'
                      }`}
                    >
                      {date.getDate()}
                      {hasItems && (
                        <span
                          className={`absolute bottom-1 h-[3px] w-[3px] rounded-full ${
                            selected ? 'bg-white/80' : inMonth ? 'bg-ink-soft/60' : 'bg-ink-faint/60'
                          }`}
                        />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}
