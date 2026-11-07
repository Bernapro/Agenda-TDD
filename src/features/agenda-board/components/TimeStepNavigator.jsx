import { IconTriangleLeft, IconTriangleRight } from '../../../shared/components/icons'
import { RANGE_OPTIONS } from '../utils/dateRangeCalculator'

export function TimeStepNavigator({ range, onStep }) {
  const unit = (RANGE_OPTIONS.find((o) => o.value === range) || RANGE_OPTIONS[0]).unit
  const btn =
    'grid h-9 w-9 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover active:scale-95 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:outline-none'

  return (
    <nav
      aria-label="Navegación temporal"
      className="absolute right-8 bottom-6 flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-float print:hidden"
    >
      <button
        type="button"
        onClick={() => onStep(-1)}
        aria-label={`${unit} anterior`}
        title={`${unit} anterior  ←`}
        className={btn}
      >
        <IconTriangleLeft size={12} />
      </button>
      <span className="min-w-16 px-1 text-center text-[12.5px] font-medium text-ink-soft" aria-live="polite">
        {unit}
      </span>
      <button
        type="button"
        onClick={() => onStep(1)}
        aria-label={`${unit} siguiente`}
        title={`${unit} siguiente  →`}
        className={btn}
      >
        <IconTriangleRight size={12} />
      </button>
    </nav>
  )
}
