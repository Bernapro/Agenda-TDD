import { SIDEBAR_PADDING_X } from '../../sidebar-navigation/constants/layout'

/**
 * Lienzo principal del tablero: barra de herramientas superior, línea de tiempo centrada (max-w-[760px])
 * y navegador flotante inferior derecho.
 */
export function AgendaMainBoard({ toolbarStart, toolbarEnd, navigator, sidebarOpen, wide = false, children }) {
  return (
    <section aria-label="Tablero de agenda" className="relative min-h-0 bg-canvas print:bg-white">
      <div className="h-full overflow-y-auto print:h-auto print:overflow-visible">
        <div
          className="flex items-center justify-between gap-4 pt-6 pr-8 transition-[padding] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] print:hidden"
          style={{ paddingLeft: sidebarOpen ? 32 : SIDEBAR_PADDING_X }}
        >
          {toolbarStart}
          {toolbarEnd}
        </div>
        <div
          className={`mx-auto ${
            wide ? 'max-w-[1160px]' : 'max-w-[760px]'
          } px-8 pt-8 pb-32 transition-[max-width] duration-200 print:max-w-none print:px-0 print:pb-0`}
        >
          {children}
        </div>
      </div>
      {navigator}
    </section>
  )
}
