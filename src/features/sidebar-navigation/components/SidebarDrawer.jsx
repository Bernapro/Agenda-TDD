import { useEffect, useRef, useState } from 'react'
import { SIDEBAR_HEADER_HEIGHT, SIDEBAR_PADDING_X, SIDEBAR_WIDTH } from '../constants/layout'
import { FixedBrandHeader } from './FixedBrandHeader'

/**
 * Drawer colapsable de 280px. El grid padre anima el ancho de la columna mientras el panel
 * se desliza con translate-x; la cabecera de marca permanece fija encima en todo momento.
 */
export function SidebarDrawer({ open, onToggle, children, footer }) {
  const bodyRef = useRef(null)
  const [gutter, setGutter] = useState(0)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = () => setGutter(body.offsetWidth - body.clientWidth)
    const ro = new ResizeObserver(measure)
    ro.observe(body)
    Array.from(body.children).forEach((c) => ro.observe(c))
    measure()
    return () => ro.disconnect()
  }, [])

  return (
    <>
      <FixedBrandHeader open={open} onToggle={onToggle} scrollbarGutter={gutter} />

      <aside aria-label="Menú lateral" className="relative z-10 min-h-0 overflow-hidden print:hidden">
        <div
          id="sidebar-drawer"
          inert={!open}
          className={`flex h-full flex-col border-r border-line bg-panel transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: SIDEBAR_WIDTH }}
        >
          {/* Espaciador superior de 64px detrás de <FixedBrandHeader /> */}
          <div className="shrink-0" style={{ height: SIDEBAR_HEADER_HEIGHT }} aria-hidden="true" />

          <div
            ref={bodyRef}
            className={`scrollbar-subtle flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-3 transition-opacity duration-200 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ paddingLeft: SIDEBAR_PADDING_X, paddingRight: SIDEBAR_PADDING_X }}
          >
            {children}
          </div>

          {footer && (
            <div
              className={`shrink-0 border-t border-line py-3 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
              style={{ paddingLeft: SIDEBAR_PADDING_X, paddingRight: SIDEBAR_PADDING_X }}
            >
              {footer}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
