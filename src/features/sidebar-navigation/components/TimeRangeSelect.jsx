import { useCallback, useId, useRef, useState } from 'react'
import { IconCalendar, IconCheck, IconChevronDown } from '../../../shared/components/icons'
import { useDismiss } from '../../../shared/hooks/useDismiss'
import { RANGE_OPTIONS, rangeHint } from '../../agenda-board/utils/dateRangeCalculator'

export function TimeRangeSelect({ value, today, onChange }) {
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const ref = useRef(null)
  const listId = useId()
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  const current = RANGE_OPTIONS.find((o) => o.value === value) || RANGE_OPTIONS[0]

  const openList = () => {
    setHighlight(Math.max(0, RANGE_OPTIONS.findIndex((o) => o.value === value)))
    setOpen(true)
  }

  const select = (v) => {
    onChange(v)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % RANGE_OPTIONS.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h - 1 + RANGE_OPTIONS.length) % RANGE_OPTIONS.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      select(RANGE_OPTIONS[highlight].value)
    }
  }

  return (
    <div ref={ref} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${highlight}` : undefined}
        aria-label="Rango temporal"
        onClick={() => (open ? setOpen(false) : openList())}
        className={`flex h-10 w-full items-center gap-2.5 rounded-lg border bg-surface px-3 text-left text-[14px] shadow-whisper transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
          open ? 'border-accent/40' : 'border-line hover:border-ink-faint/60'
        }`}
      >
        <IconCalendar size={16} className="text-ink-soft" />
        <span className="flex-1 font-medium text-ink">{current.label}</span>
        <IconChevronDown size={16} className={`text-ink-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Rango temporal"
          className="absolute top-full right-0 left-0 z-30 mt-1.5 animate-pop rounded-xl border border-line bg-surface p-1 shadow-float"
        >
          {RANGE_OPTIONS.map((opt, i) => {
            const selected = opt.value === value
            return (
              <li
                key={opt.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => select(opt.value)}
                className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2.5 text-[13.5px] ${
                  i === highlight ? 'bg-panel' : ''
                }`}
              >
                <span className="grid w-4 place-items-center text-accent">
                  {selected && <IconCheck size={14} strokeWidth={2.25} />}
                </span>
                <span className={`flex-1 ${selected ? 'font-medium text-ink' : 'text-ink'}`}>{opt.label}</span>
                <span className="font-mono text-[12px] text-ink-faint tabular-nums">{rangeHint(opt.value, today)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
