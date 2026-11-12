import { useCallback, useEffect, useRef, useState } from 'react'
import { IconCalendar, IconCheck, IconChevronDown, IconDownload, IconFileText, IconTable } from '../../../shared/components/icons'
import { useDismiss } from '../../../shared/hooks/useDismiss'
import { downloadCSV, downloadICS, exportFileBase, exportTitle, exportToPDF } from '../utils/exportUtils'

const OPTIONS = [
  { format: 'pdf', label: 'Exportar vista a PDF', description: 'Documento limpio listo para imprimir', Icon: IconFileText },
  { format: 'ics', label: 'Exportar calendario', description: 'Compatible con Google / Apple Calendar', Icon: IconCalendar },
  { format: 'csv', label: 'Exportar tabla de datos', description: 'Para hojas de cálculo', Icon: IconTable },
]

export function ExportMenuButton({ occurrences = [], activeDate, range, today, boardView = 'list' }) {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1800)
    return () => clearTimeout(t)
  }, [done])

  const empty = occurrences.length === 0

  const run = (format) => {
    setOpen(false)
    const base = exportFileBase(activeDate, range)
    const title = exportTitle(activeDate, range, today)
    if (format === 'pdf') {
      requestAnimationFrame(() =>
        exportToPDF({
          occurrences,
          activeDate,
          range,
          today,
          boardView,
        }),
      )
    } else if (format === 'ics') {
      downloadICS(occurrences, title, base)
    } else {
      downloadCSV(occurrences, base)
    }
    setDone(true)
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center gap-2.5 rounded-lg border px-3 text-left text-[14px] transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
          open ? 'border-line bg-surface text-ink' : 'border-line bg-surface/70 text-ink-soft'
        }`}
      >
        {done ? <IconCheck size={16} strokeWidth={2.25} className="text-accent" /> : <IconDownload size={16} />}
        <span className="flex-1" aria-live="polite">
          {done ? 'Exportado' : 'Exportar'}
        </span>
        <IconChevronDown size={15} className={`transition-transform duration-200 ${open ? '' : 'rotate-180'}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Exportar"
          className="absolute right-0 bottom-full left-0 z-30 mb-2 animate-pop rounded-xl border border-line bg-surface p-1.5 shadow-float"
        >
          <p className="flex items-center justify-between px-2.5 pt-1.5 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
            <span>Vista actual</span>
            <span className="font-mono font-normal tracking-normal normal-case">
              {occurrences.length} {occurrences.length === 1 ? 'actividad' : 'actividades'}
            </span>
          </p>
          {OPTIONS.map(({ format, label, description, Icon }, i) => {
            const disabled = empty && format !== 'pdf'
            return (
              <button
                key={format}
                type="button"
                role="menuitem"
                autoFocus={i === 0}
                disabled={disabled}
                onClick={() => run(format)}
                className="flex w-full items-start gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-canvas focus-visible:bg-canvas focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-ink-soft">
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[13.5px] font-medium text-ink">{label}</span>
                    <span className="font-mono text-[11px] text-ink-faint">.{format}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">{description}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
