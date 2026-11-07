import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from './icons'

export function Dialog({ onClose, labelledBy, width = 'max-w-[480px]', children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-[6vh]">
      <div className="fixed inset-0 animate-fade bg-ink/20 backdrop-blur-[2px]" onMouseDown={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative my-auto w-full ${width} animate-pop overflow-hidden rounded-xl border border-line bg-surface shadow-float`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogHeader({ id, title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
      <div>
        <h2 id={id} className="text-[16px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
      >
        <IconX size={16} />
      </button>
    </div>
  )
}
