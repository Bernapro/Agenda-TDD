import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { normalizeTagNameForDb, sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'
import { IconPlus, IconX } from '../../../shared/components/icons'
import { useDismiss } from '../../../shared/hooks/useDismiss'
import { useTagSearchDebounce } from '../hooks/useTagSearchDebounce'
import { DEFAULT_PRESET_TAGS } from '../hooks/useInfiniteTags'
import { etiquetaService } from '../services/etiquetaService'
import { mergeUniqueTags, tagKey } from '../utils/tagUtils'
import { TagDot } from './TagPill'

const TONE_CLASSES = {
  canvas: 'bg-canvas focus-within:bg-surface',
  surface: 'bg-surface',
}

/**
 * Selector reutilizable de etiquetas con buscador (debounce 350ms) y sugerencias tipo barra de navegador.
 *
 * - Solo muestra como tarjetas las etiquetas seleccionadas/añadidas (nunca todo el catálogo).
 * - Clic en una sugerencia (o Enter sobre la resaltada) la coloca en el textfield con su color;
 *   el botón "+ Añadir" de la sugerencia la agrega directamente.
 * - "+ Etiqueta" (o Enter) agrega el texto actual: si coincide con una etiqueta existente usa su
 *   nombre/color oficial; si no, la normaliza (^#[a-zA-Z0-9!()_-]+$, máx. 50) con `defaultColor`.
 */
export function TagSearchInput({
  selectedTags = [],
  onChange,
  availableTags = [],
  defaultColor = '#3B82F6',
  onSelectColor,
  tone = 'canvas',
  placeholder = 'Buscar o crear etiqueta (ej. Finanzas)',
  readOnly = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [preselected, setPreselected] = useState(null)
  const [committing, setCommitting] = useState(false)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const close = useCallback(() => {
    setOpen(false)
    setHighlight(-1)
  }, [])
  useDismiss(containerRef, open, close)

  // Catálogo local conocido (presets + etiquetas cargadas en memoria) para sugerencias rápidas
  const localPool = useMemo(() => mergeUniqueTags(availableTags, DEFAULT_PRESET_TAGS), [availableTags])

  const { results, loading } = useTagSearchDebounce(query, localPool)

  const selectedKeys = useMemo(() => new Set(selectedTags.map(tagKey)), [selectedTags])

  // La preselección solo sigue activa mientras el texto coincida con ella
  const activePreselected =
    preselected && stripLeadingHash(query.trim()).toLowerCase() === preselected.label.toLowerCase()
      ? preselected
      : null

  const trimmedQuery = query.trim()
  const showDropdown = open && trimmedQuery.length > 0 && !activePreselected
  const activeIndex = highlight >= 0 && highlight < results.length ? highlight : -1

  // Dentro de formularios con scroll interno, garantiza que las sugerencias queden visibles
  useEffect(() => {
    if (showDropdown) {
      dropdownRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [showDropdown, results.length])

  const resetInput = () => {
    setQuery('')
    setPreselected(null)
    setHighlight(-1)
    setOpen(false)
  }

  const addTag = (tag, { isExisting = false } = {}) => {
    if (!tag) return
    const key = tagKey(tag)
    if (!key) return
    if (!selectedKeys.has(key)) {
      onChange?.([...selectedTags, tag])
      if (isExisting) onSelectColor?.(tag.hexColor)
    }
    resetInput()
    inputRef.current?.focus()
  }

  const preselect = (tag) => {
    setPreselected(tag)
    setQuery(tag.label)
    setHighlight(-1)
    setOpen(false)
    inputRef.current?.focus()
  }

  const findExistingMatch = (normalizedName, pool) => {
    const target = normalizedName.toLowerCase()
    return pool.find((t) => t.nombre.toLowerCase() === target) || null
  }

  // "+ Etiqueta" / Enter: agrega el texto actual como tarjeta seleccionada
  const commitCurrentInput = async () => {
    if (committing) return
    if (activePreselected) {
      addTag(activePreselected, { isExisting: true })
      return
    }

    const normalized = normalizeTagNameForDb(query)
    if (!normalized) return

    let match = findExistingMatch(normalized, [...results, ...localPool])
    if (!match) {
      // Coincidencia exacta en la BD aunque el debounce aún no haya respondido
      setCommitting(true)
      try {
        const remote = await etiquetaService.buscarPorNombre(normalized, { availableTags: localPool })
        match = findExistingMatch(normalized, mergeUniqueTags(remote))
      } catch {
        match = null
      } finally {
        setCommitting(false)
      }
    }

    if (match) {
      addTag(match, { isExisting: true })
      return
    }

    addTag(
      {
        id: normalized.toLowerCase(),
        nombre: normalized,
        label: stripLeadingHash(normalized),
        hexColor: sanitizeHexColor(defaultColor, '#3B82F6'),
      },
      { isExisting: false },
    )
  }

  const removeTag = (tag) => {
    const key = tagKey(tag)
    onChange?.(selectedTags.filter((t) => tagKey(t) !== key))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (!trimmedQuery) return
      e.preventDefault()
      setOpen(true)
      setHighlight((prev) => (results.length === 0 ? -1 : (prev + 1) % results.length))
      return
    }
    if (e.key === 'ArrowUp') {
      if (!showDropdown) return
      e.preventDefault()
      setHighlight((prev) => (results.length === 0 ? -1 : prev <= 0 ? results.length - 1 : prev - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showDropdown && activeIndex >= 0) {
        const tag = results[activeIndex]
        if (!selectedKeys.has(tagKey(tag))) preselect(tag)
        return
      }
      commitCurrentInput()
      return
    }
    if (e.key === 'Escape' && (showDropdown || activePreselected)) {
      // Evita que el Escape cierre también el diálogo contenedor
      e.preventDefault()
      e.stopPropagation()
      close()
      return
    }
    if (e.key === 'Backspace' && !query && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1])
    }
  }

  const listboxId = `${useId()}-tag-suggestions`

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Tarjetas: únicamente las etiquetas seleccionadas / añadidas */}
      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tagKey(tag)}
              className={`inline-flex h-8 animate-pop items-center gap-1.5 rounded-full border border-ink/20 bg-surface text-[13px] font-medium text-ink shadow-whisper ${
                readOnly ? 'px-3' : 'pr-2 pl-3'
              }`}
            >
              <TagDot color={tag.hexColor} size={7} />
              <span>
                <span className="text-ink-faint">#</span>
                {stripLeadingHash(tag.nombre || tag.label)}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Quitar etiqueta ${stripLeadingHash(tag.nombre || tag.label)}`}
                  className="grid h-5 w-5 place-items-center rounded-full text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                >
                  <IconX size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        readOnly && <p className="text-[12.5px] text-ink-faint">Sin etiquetas asignadas.</p>
      )}

      {/* Textfield con sugerencias + botón "+ Etiqueta" */}
      {!readOnly && (
      <div className="flex items-start gap-2">
        <div className="relative min-w-0 flex-1">
          <div
            className={`flex h-9 items-center gap-2 rounded-lg border border-line px-2.5 transition-colors focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/15 ${
              TONE_CLASSES[tone] || TONE_CLASSES.canvas
            }`}
          >
            {activePreselected ? (
              <TagDot color={activePreselected.hexColor} size={8} />
            ) : (
              <span className="font-mono text-[13px] text-ink-faint">#</span>
            )}
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-label="Buscar etiqueta"
              maxLength={50}
              value={query}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value)
                setHighlight(-1)
                setOpen(true)
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
            />
            {(loading || committing) && trimmedQuery && (
              <span className="shrink-0 text-[11px] text-ink-faint">Buscando…</span>
            )}
          </div>

          {showDropdown && (
            <div
              ref={dropdownRef}
              id={listboxId}
              role="listbox"
              className="absolute top-full right-0 left-0 z-30 mt-1 max-h-48 animate-pop overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-float scrollbar-subtle"
            >
              {results.length === 0 ? (
                <p className="px-3 py-2.5 text-[12.5px] text-ink-soft">
                  {loading ? (
                    'Buscando etiquetas…'
                  ) : (
                    <>
                      Sin coincidencias. Pulsa <span className="font-medium text-ink">+ Etiqueta</span> para crear{' '}
                      <span className="font-medium text-ink">{normalizeTagNameForDb(query) || '#…'}</span>
                    </>
                  )}
                </p>
              ) : (
                results.map((tag, idx) => {
                  const alreadyAdded = selectedKeys.has(tagKey(tag))
                  const isActive = idx === activeIndex
                  return (
                    <div
                      key={tagKey(tag)}
                      role="option"
                      aria-selected={isActive}
                      aria-disabled={alreadyAdded}
                      onMouseEnter={() => setHighlight(idx)}
                      className={`flex items-center gap-1 rounded-lg transition-colors ${
                        isActive && !alreadyAdded ? 'bg-canvas' : ''
                      } ${alreadyAdded ? 'opacity-50' : ''}`}
                    >
                      <button
                        type="button"
                        disabled={alreadyAdded}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => preselect(tag)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-[13px] disabled:cursor-not-allowed"
                      >
                        <TagDot color={tag.hexColor} size={7} />
                        <span className="truncate text-ink">
                          <span className="text-ink-faint">#</span>
                          {tag.label}
                        </span>
                      </button>
                      {alreadyAdded ? (
                        <span className="shrink-0 px-2.5 font-mono text-[11px] text-ink-faint">Ya añadida</span>
                      ) : (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => addTag(tag, { isExisting: true })}
                          className="mr-1 shrink-0 rounded-md px-2 py-1 font-mono text-[11px] text-ink-faint transition-colors hover:bg-accent-soft hover:text-accent"
                        >
                          + Añadir
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={commitCurrentInput}
          disabled={!trimmedQuery || committing}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-soft transition-colors hover:border-accent/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          <IconPlus size={13} />
          Etiqueta
        </button>
      </div>
      )}
    </div>
  )
}
