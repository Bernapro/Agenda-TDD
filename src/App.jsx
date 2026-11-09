import { useCallback, useEffect, useMemo, useState } from 'react'
import { AgendaMainBoard } from './features/agenda-board/components/AgendaMainBoard'
import { CreateItemCombobox } from './features/agenda-board/components/CreateItemCombobox'
import { ExportMenuButton } from './features/agenda-board/components/ExportMenuButton'
import { TimelineTaskList } from './features/agenda-board/components/TimelineTaskList'
import { TimeStepNavigator } from './features/agenda-board/components/TimeStepNavigator'
import { TopDateHeader } from './features/agenda-board/components/TopDateHeader'
import { useCalendarMonthMarks } from './features/agenda-board/hooks/useCalendarMonthMarks'
import { useInfiniteAgendaFeed } from './features/agenda-board/hooks/useInfiniteAgendaFeed'
import { fromKey, isSameDay, stepDate } from './features/agenda-board/utils/dateRangeCalculator'
import { ContactsDialog } from './features/contacts/components/ContactsDialog'
import { contactoService } from './features/contacts/services/contactoService'
import { SearchDialog } from './features/search/components/SearchDialog'
import { ContactsButton } from './features/sidebar-navigation/components/ContactsButton'
import { MiniMonthCalendar } from './features/sidebar-navigation/components/MiniMonthCalendar'
import { SearchTrigger } from './features/sidebar-navigation/components/SearchTrigger'
import { SidebarDrawer } from './features/sidebar-navigation/components/SidebarDrawer'
import { TimeRangeSelect } from './features/sidebar-navigation/components/TimeRangeSelect'
import { SIDEBAR_WIDTH } from './features/sidebar-navigation/constants/layout'
import { useSidebarState } from './features/sidebar-navigation/hooks/useSidebarState'
import { TagFilterList } from './features/tags/components/TagFilterList'
import { useInfiniteTags } from './features/tags/hooks/useInfiniteTags'
import { sanitizeHexColor, stripLeadingHash } from './shared/api/httpClient'
import { CreateItemDialog } from './shared/components/CreateItemDialog'
import { IconX } from './shared/components/icons'

function getTodayDate() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getCurrentMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export default function App() {
  const [today, setToday] = useState(getTodayDate)
  const [nowMinutes, setNowMinutes] = useState(getCurrentMinutes)
  const [activeDate, setActiveDate] = useState(getTodayDate)
  const [range, setRange] = useState('day')
  const { sidebarOpen, toggleSidebar } = useSidebarState(true)
  const [selectedTags, setSelectedTags] = useState([])
  const [dialog, setDialog] = useState(null)
  const [contactsCount, setContactsCount] = useState(0)

  // Actualiza el marcador de hora actual cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setToday(getTodayDate())
      setNowMinutes(getCurrentMinutes())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Carga inicial ligera del contador de contactos
  const refreshContactsCount = useCallback(async () => {
    try {
      const list = await contactoService.obtenerPorCursor({ id: 0, limit: 50 })
      if (Array.isArray(list)) {
        setContactsCount(list.length)
      }
    } catch {
      // Silencioso si el backend aún no está levantado
    }
  }, [])

  useEffect(() => {
    refreshContactsCount()
  }, [refreshContactsCount])

  // Etiquetas del menú lateral paginadas por cursor (/agenda/etiquetas/etiquetaCursor)
  const {
    tags: cursorTags,
    hasMore: hasMoreTags,
    loadMoreTags,
    refreshTags,
  } = useInfiniteTags()

  // Feed infinito paralelo de Tareas/Rutinas (/agenda/tareas/cursor) y Eventos (/agenda/eventos/cursor)
  const {
    inRangeItems,
    allLoadedItems,
    visibleItems,
    tagCounts,
    routinesHidden,
    hasMore: hasMoreFeed,
    loadingInitial,
    loadingMore,
    error: feedError,
    loadMore: loadMoreFeed,
    refreshFeed,
    toggleTask,
  } = useInfiniteAgendaFeed({
    activeDate,
    range,
    selectedTags,
  })

  // Puntos indicadores de actividad por mes en el mini-calendario (/agenda/actividades/mes)
  const { getMarkedKeys, invalidateMonthCache } = useCalendarMonthMarks(allLoadedItems)

  // Combina las etiquetas paginadas del cursor con las etiquetas presentes en actividades cargadas
  const sidebarTags = useMemo(() => {
    const map = new Map()
    for (const t of cursorTags) {
      const clean = stripLeadingHash(t.nombre || t.label || '')
      if (!clean) continue
      map.set(clean.toLowerCase(), {
        id: t.id,
        nombre: `#${clean}`,
        label: clean,
        hexColor: sanitizeHexColor(t.hexColor || t.color, '#6B7280'),
        color: sanitizeHexColor(t.hexColor || t.color, '#6B7280'),
      })
    }
    for (const item of inRangeItems) {
      for (const t of item.etiquetas || []) {
        const clean = stripLeadingHash(t.nombre || t.label || '')
        if (!clean) continue
        const key = clean.toLowerCase()
        if (!map.has(key)) {
          map.set(key, {
            id: t.id ?? `#${clean}`,
            nombre: `#${clean}`,
            label: clean,
            hexColor: sanitizeHexColor(t.hexColor || t.color, '#6B7280'),
            color: sanitizeHexColor(t.hexColor || t.color, '#6B7280'),
          })
        }
      }
    }
    return Array.from(map.values())
  }, [cursorTags, inRangeItems])

  const tagByName = useMemo(() => {
    const m = new Map()
    for (const t of sidebarTags) {
      m.set(t.nombre.toLowerCase(), t)
      if (t.id !== undefined && t.id !== null) {
        m.set(String(t.id).toLowerCase(), t)
      }
    }
    return m
  }, [sidebarTags])

  const step = useCallback((dir) => setActiveDate((d) => stepDate(d, range, dir)), [range])
  const closeDialog = useCallback(() => setDialog(null), [])

  const tasks = useMemo(() => visibleItems.filter((o) => o.kind === 'task'), [visibleItems])
  const doneTasks = useMemo(() => tasks.filter((o) => o.done).length, [tasks])

  // Atajos globales: ⌘K / Ctrl+K abre el buscador; ← / → navegan en el tiempo
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setDialog({ type: 'search' })
        return
      }
      if (dialog || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target
      if (target?.closest?.('input, textarea, select, [role="listbox"], [role="menu"], [role="combobox"]')) return
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, step])

  const changeRange = (nextRange) => {
    setRange(nextRange)
    setActiveDate(today)
  }

  const toggleTag = (tagKey) => {
    setSelectedTags((prev) => {
      const exists = prev.some((k) => String(k).toLowerCase() === String(tagKey).toLowerCase())
      return exists
        ? prev.filter((k) => String(k).toLowerCase() !== String(tagKey).toLowerCase())
        : [...prev, tagKey]
    })
  }

  const openDay = (date) => {
    setActiveDate(date)
    setRange('day')
  }

  const handleItemCreated = ({ kind, dateKey }) => {
    if (dateKey) {
      setActiveDate(fromKey(dateKey))
    }
    if (kind === 'routine' && (range === 'month' || range === 'year')) {
      setRange('day')
    }
    invalidateMonthCache()
    refreshFeed()
    refreshTags()
  }

  return (
    <div
      className="grid h-screen w-full overflow-hidden bg-canvas text-ink transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] print:block print:h-auto print:overflow-visible"
      style={{ gridTemplateColumns: `${sidebarOpen ? SIDEBAR_WIDTH : 0}px minmax(0, 1fr)` }}
    >
      <SidebarDrawer
        open={sidebarOpen}
        onToggle={toggleSidebar}
        footer={<ExportMenuButton occurrences={visibleItems} activeDate={activeDate} range={range} today={today} />}
      >
        <TimeRangeSelect value={range} today={today} onChange={changeRange} />
        <SearchTrigger onOpen={() => setDialog({ type: 'search' })} />
        <ContactsButton count={contactsCount} onOpen={() => setDialog({ type: 'contacts' })} />
        <div className="mt-2">
          <MiniMonthCalendar
            activeDate={activeDate}
            today={today}
            range={range}
            onSelect={setActiveDate}
            getMarkedKeys={getMarkedKeys}
          />
        </div>
        <div className="mt-4 flex flex-1 flex-col">
          <TagFilterList
            tags={sidebarTags}
            counts={tagCounts}
            selected={selectedTags}
            onToggle={toggleTag}
            onClear={() => setSelectedTags([])}
            hasMore={hasMoreTags}
            onLoadMore={loadMoreTags}
          />
        </div>
      </SidebarDrawer>

      <main className="grid min-h-0 min-w-0 grid-rows-[64px_minmax(0,1fr)] print:block">
        <TopDateHeader activeDate={activeDate} range={range} today={today} onGoToday={() => setActiveDate(today)} />

        <AgendaMainBoard
          sidebarOpen={sidebarOpen}
          toolbarStart={<CreateItemCombobox onCreate={(kind) => setDialog({ type: 'create', kind })} />}
          toolbarEnd={
            <div className="flex flex-wrap items-center justify-end gap-3 text-[13px] text-ink-soft">
              {selectedTags.map((tagKey) => {
                const tagMeta = tagByName.get(String(tagKey).toLowerCase())
                const cleanLabel = stripLeadingHash(tagMeta?.nombre || tagMeta?.label || String(tagKey))
                const dotColor = sanitizeHexColor(tagMeta?.hexColor || tagMeta?.color, '#6B7280')
                return (
                  <button
                    key={tagKey}
                    type="button"
                    onClick={() => toggleTag(tagKey)}
                    aria-label={`Quitar filtro ${cleanLabel}`}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface pr-1.5 pl-2.5 text-[12.5px] text-ink-soft transition-colors hover:text-ink"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                    #{cleanLabel}
                    <IconX size={12} />
                  </button>
                )
              })}
              <span className="tabular-nums">
                {visibleItems.length} {visibleItems.length === 1 ? 'actividad' : 'actividades'}
                {tasks.length > 0 && (
                  <span className="text-ink-faint">
                    {' '}
                    · {doneTasks}/{tasks.length} tareas
                  </span>
                )}
              </span>
            </div>
          }
          navigator={<TimeStepNavigator range={range} onStep={step} />}
        >
          {feedError && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-soft shadow-whisper">
              <span>{feedError}</span>
              <button
                type="button"
                onClick={refreshFeed}
                className="rounded-lg border border-line bg-canvas px-3 py-1 text-[12.5px] font-medium text-accent hover:bg-accent-soft"
              >
                Reintentar
              </button>
            </div>
          )}

          <TimelineTaskList
            occurrences={visibleItems}
            range={range}
            activeDate={activeDate}
            today={today}
            nowMinutes={nowMinutes}
            routinesHidden={routinesHidden}
            loadingInitial={loadingInitial}
            loadingMore={loadingMore}
            hasMore={hasMoreFeed}
            onLoadMore={loadMoreFeed}
            onToggleTask={toggleTask}
            onOpenDay={openDay}
            onCreate={() => setDialog({ type: 'create', kind: 'event' })}
          />
        </AgendaMainBoard>
      </main>

      {dialog?.type === 'create' && (
        <CreateItemDialog
          initialKind={dialog.kind}
          defaultDate={activeDate}
          defaultStart={isSameDay(activeDate, today) ? Math.min(Math.ceil(nowMinutes / 30) * 30, 23 * 60) : 9 * 60}
          availableTags={sidebarTags}
          onClose={closeDialog}
          onSuccess={handleItemCreated}
        />
      )}

      {dialog?.type === 'search' && (
        <SearchDialog
          items={allLoadedItems}
          onClose={closeDialog}
          onSelect={(dateKey) => {
            if (dateKey) {
              openDay(fromKey(dateKey))
            }
            closeDialog()
          }}
        />
      )}

      {dialog?.type === 'contacts' && (
        <ContactsDialog
          availableTags={sidebarTags}
          onClose={closeDialog}
          onContactCreated={refreshContactsCount}
        />
      )}
    </div>
  )
}
