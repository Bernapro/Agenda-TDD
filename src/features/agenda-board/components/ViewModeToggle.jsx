import { IconCalendar, IconList } from '../../../shared/components/icons'

const MODES = [
  { value: 'list', label: 'Lista', Icon: IconList },
  { value: 'calendar', label: 'Calendario', Icon: IconCalendar },
]

export function ViewModeToggle({ value = 'list', onChange }) {
  return (
    <div
      role="group"
      aria-label="Cambiar vista del tablero"
      className="inline-flex h-10 items-center gap-1 rounded-lg border border-line bg-surface p-1 shadow-whisper"
    >
      {MODES.map(({ value: modeValue, label, Icon }) => {
        const active = value === modeValue
        return (
          <button
            key={modeValue}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(modeValue)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
              active
                ? 'bg-accent text-white shadow-whisper'
                : 'text-ink-soft hover:bg-canvas hover:text-ink'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
