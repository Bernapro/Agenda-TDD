import { useCallback, useRef, useState } from 'react'
import { IconChevronDown, IconPlus, KIND_META } from '../../../shared/components/icons'
import { Kbd } from '../../../shared/components/Kbd'
import { useDismiss } from '../../../shared/hooks/useDismiss'

const KINDS = ['event', 'task', 'routine']

export function CreateItemCombobox({ onCreate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const pick = (kind) => {
    setOpen(false)
    onCreate(kind)
  }

  const onKeyDown = (e) => {
    if (!open) return
    const kind = KINDS.find((k) => KIND_META[k].shortcut.toLowerCase() === e.key.toLowerCase())
    if (kind) {
      e.preventDefault()
      pick(kind)
    }
  }

  return (
    <div ref={ref} className="relative inline-flex" onKeyDown={onKeyDown}>
      <div className="inline-flex h-10 rounded-lg bg-accent text-white shadow-whisper">
        <button
          type="button"
          onClick={() => pick('event')}
          className="inline-flex items-center gap-1.5 rounded-l-lg pr-3 pl-3.5 text-[14px] font-medium transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none"
        >
          <IconPlus size={16} strokeWidth={2.25} />
          crear
        </button>
        <span className="my-2.5 w-px bg-white/25" aria-hidden="true" />
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Elegir tipo de elemento"
          onClick={() => setOpen((o) => !o)}
          className={`grid w-9 place-items-center rounded-r-lg transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:outline-none ${
            open ? 'bg-accent-hover' : ''
          }`}
        >
          <IconChevronDown size={16} strokeWidth={2.25} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Crear nuevo"
          className="absolute top-full left-0 z-30 mt-2 w-[300px] animate-pop rounded-xl border border-line bg-surface p-1.5 shadow-float"
        >
          <p className="px-2.5 pt-1.5 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">Crear nuevo</p>
          {KINDS.map((kind, i) => {
            const { label, description, shortcut, Icon, tile } = KIND_META[kind]
            return (
              <button
                key={kind}
                type="button"
                role="menuitem"
                autoFocus={i === 0}
                onClick={() => pick(kind)}
                className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tile}`}>
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{label}</span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{description}</span>
                </span>
                <Kbd>{shortcut}</Kbd>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
