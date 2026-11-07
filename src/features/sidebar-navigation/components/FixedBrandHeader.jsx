import { IconPanelLeft } from '../../../shared/components/icons'
import { SIDEBAR_HEADER_HEIGHT, SIDEBAR_HEADER_ROW, SIDEBAR_PADDING_X, SIDEBAR_WIDTH } from '../constants/layout'

export function SidebarToggle({ open, onToggle }) {
  const label = open ? 'Ocultar menú lateral' : 'Mostrar menú lateral'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="sidebar-drawer"
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
        open ? 'bg-ink/[0.06] text-ink hover:bg-ink/[0.09]' : 'text-ink-soft hover:bg-ink/[0.05] hover:text-ink'
      }`}
    >
      <IconPanelLeft open={open} size={18} />
    </button>
  )
}

/**
 * Cabecera fija (z-40) en la esquina superior izquierda (top: 16px, left: 16px, height: 32px).
 * Su ancho compensa el scrollbarGutter medido con ResizeObserver para alinear exactamente el botón derecho.
 */
export function FixedBrandHeader({ open, onToggle, scrollbarGutter = 0 }) {
  const top = (SIDEBAR_HEADER_HEIGHT - SIDEBAR_HEADER_ROW) / 2
  return (
    <div
      className="fixed z-40 flex items-center justify-between print:hidden"
      style={{
        top,
        left: SIDEBAR_PADDING_X,
        height: SIDEBAR_HEADER_ROW,
        width: SIDEBAR_WIDTH - SIDEBAR_PADDING_X * 2 - (open ? scrollbarGutter : 0),
      }}
    >
      <span className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-[12px] font-semibold text-white" aria-hidden="true">
          A
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-ink">Agenda</span>
      </span>
      <SidebarToggle open={open} onToggle={onToggle} />
    </div>
  )
}
