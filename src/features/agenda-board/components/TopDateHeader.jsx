import { IconCornerLeft } from '../../../shared/components/icons'
import { formatHeader, rangeContains } from '../utils/dateRangeCalculator'

export function TopDateHeader({ activeDate, range, today, onGoToday }) {
  const { lead, rest } = formatHeader(activeDate, range, today)
  const isCurrent = rangeContains(activeDate, range, today)

  return (
    <header className="grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-line px-6 print:px-0">
      <div aria-hidden="true" />

      <h1 aria-live="polite" className="font-display text-[22px] leading-none tracking-[-0.02em] whitespace-nowrap">
        <span className="font-semibold text-ink">{lead}</span> <span className="font-medium text-ink-soft">{rest}</span>
      </h1>

      <div className="flex justify-end print:hidden">
        {!isCurrent && (
          <button
            type="button"
            onClick={onGoToday}
            className="inline-flex h-8 animate-fade items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-soft transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            <IconCornerLeft size={14} />
            Volver a hoy
          </button>
        )}
      </div>
    </header>
  )
}
