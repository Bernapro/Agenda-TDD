import { useEffect, useMemo, useState } from 'react'
import { sanitizeHexColor } from '../../../shared/api/httpClient'
import { Dialog } from '../../../shared/components/Dialog'
import { IconSearch, KIND_META } from '../../../shared/components/icons'
import { Kbd } from '../../../shared/components/Kbd'
import { extractDateKeyFromISO, extractTimeFromISO } from '../../../shared/utils/isoDateFormatter'
import { MONTHS_SHORT, WEEKDAYS_SHORT, fromKey, minutesToTime, pad2 } from '../../agenda-board/utils/dateRangeCalculator'
import { TagPill } from '../../tags/components/TagPill'
import { actividadSearchService } from '../services/actividadSearchService'

const normalize = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function formatShortDate(dateKey) {
  if (!dateKey) return ''
  const d = fromKey(dateKey)
  return `${WEEKDAYS_SHORT[d.getDay()]} ${pad2(d.getDate())} ${MONTHS_SHORT[d.getMonth()]}`
}

function adaptRemoteActividad(dto) {
  const dateKey = extractDateKeyFromISO(dto.fechaInicio)
  const timeText = extractTimeFromISO(dto.fechaInicio)
  const kind = dto.tipoActividad === 'EVENTO' ? 'event' : 'task'
  return {
    id: `remote-${dto.id}`,
    idActividad: dto.id,
    kind,
    title: dto.titulo || 'Actividad',
    date: dateKey,
    subtitle: `${formatShortDate(dateKey)} · ${timeText}`,
    hexColor: sanitizeHexColor(dto.hexColor, kind === 'event' ? '#3B82F6' : '#D97706'),
    tag: null,
  }
}

export function SearchDialog({ items = [], onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [remoteResults, setRemoteResults] = useState([])
  const [searchingRemote, setSearchingRemote] = useState(false)

  // Debounce estricto de 300ms contra /agenda/actividades/titulo o /agenda/actividades/etiqueta
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setRemoteResults([])
      setSearchingRemote(false)
      return
    }

    setSearchingRemote(true)
    const timer = setTimeout(async () => {
      try {
        const isTagQuery = trimmed.startsWith('#')
        const term = isTagQuery ? (trimmed.length > 1 ? trimmed : '') : trimmed
        if (!term) {
          setRemoteResults([])
          setSearchingRemote(false)
          return
        }
        const data = isTagQuery
          ? await actividadSearchService.buscarPorEtiqueta(term)
          : await actividadSearchService.buscarPorTitulo(term)
        setRemoteResults(Array.isArray(data) ? data.map(adaptRemoteActividad) : [])
      } catch {
        setRemoteResults([])
      } finally {
        setSearchingRemote(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const localFormatted = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        idActividad: item.idActividad,
        kind: item.kind,
        title: item.title,
        date: item.date,
        subtitle:
          item.kind === 'routine'
            ? `${item.repeatLabel || 'Rutina'} · ${minutesToTime(item.start)}`
            : `${formatShortDate(item.date)} · ${minutesToTime(item.start)}`,
        tag: item.etiquetas?.[0] || null,
        allTagsText: (item.etiquetas || []).map((t) => `${t.nombre} ${t.label}`).join(' '),
      })),
    [items],
  )

  const results = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) {
      return localFormatted.slice(0, 8)
    }

    const localMatches = localFormatted.filter((r) =>
      normalize(`${r.title} ${r.allTagsText || ''}`).includes(q),
    )

    const byActividadId = new Map()
    for (const loc of localMatches) {
      byActividadId.set(loc.idActividad ?? loc.id, loc)
    }
    for (const rem of remoteResults) {
      if (!byActividadId.has(rem.idActividad)) {
        byActividadId.set(rem.idActividad, rem)
      }
    }

    return Array.from(byActividadId.values()).slice(0, 10)
  }, [localFormatted, remoteResults, query])

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      onSelect(results[highlight].date)
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="search-title" width="max-w-[560px]">
      <h2 id="search-title" className="sr-only">
        Buscador
      </h2>
      <div className="flex items-center gap-3 border-b border-line px-5">
        <IconSearch size={18} className="text-ink-soft" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(0)
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar eventos, tareas, rutinas o #etiquetas"
          aria-label="Buscar"
          className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
        />
        <Kbd>Esc</Kbd>
      </div>

      <div className="scrollbar-subtle max-h-[360px] overflow-y-auto p-2">
        <p className="px-3 pt-1 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
          {query.trim()
            ? searchingRemote
              ? 'Buscando…'
              : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`
            : 'En esta vista'}
        </p>

        {!searchingRemote && results.length === 0 && (
          <p className="px-3 py-8 text-center text-[13.5px] text-ink-soft">
            {query.trim() ? `Sin coincidencias para “${query}”.` : 'No hay actividades cargadas en este rango.'}
          </p>
        )}

        <ul role="listbox" aria-label="Resultados">
          {results.map((r, i) => {
            const { Icon, tile } = KIND_META[r.kind] || KIND_META.event
            return (
              <li
                key={r.id}
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => onSelect(r.date)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${i === highlight ? 'bg-canvas' : ''}`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tile}`}>
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-ink">{r.title}</span>
                  <span className="block text-[12.5px] text-ink-soft tabular-nums">{r.subtitle}</span>
                </span>
                {r.tag && <TagPill tag={r.tag} />}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex items-center gap-4 border-t border-line bg-canvas px-5 py-2.5 text-[12px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> abrir día
        </span>
      </div>
    </Dialog>
  )
}
