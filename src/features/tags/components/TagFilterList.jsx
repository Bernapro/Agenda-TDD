import { useRef } from 'react'
import { sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'
import { IconCheck } from '../../../shared/components/icons'
import { useIntersectionObserver } from '../../../shared/hooks/useIntersectionObserver'
import { TagDot } from './TagPill'

export function TagFilterList({ tags = [], counts = {}, selected = [], onToggle, onClear, hasMore = false, onLoadMore }) {
  const listRef = useRef(null)
  const sentinelRef = useIntersectionObserver({
    onIntersect: () => onLoadMore?.(),
    enabled: Boolean(hasMore && onLoadMore),
    rootRef: listRef,
    rootMargin: '40px',
  })

  const handleScroll = (e) => {
    if (!hasMore || !onLoadMore) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 24) {
      onLoadMore()
    }
  }

  return (
    <section aria-labelledby="tags-heading" className="flex flex-1 flex-col">
      <div className="flex h-8 items-center gap-3 px-1">
        <h3 id="tags-heading" className="text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
          Etiquetas
        </h3>
        <div className="h-px flex-1 bg-line" />
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded text-[12px] text-accent hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* min-height = 3 rows (3 × 36px + 2 × 2px gap + 4px padding) so at least three tags stay visible. */}
      <ul
        ref={listRef}
        onScroll={handleScroll}
        className="scrollbar-subtle -mx-1 mt-1 min-h-[116px] flex-1 basis-[116px] space-y-0.5 overflow-y-auto px-1 pb-1"
      >
        {tags.map((tag) => {
          const cleanLabel = stripLeadingHash(tag.nombre || tag.label || '')
          const tagKey = tag.nombre || `#${cleanLabel}`
          const active = selected.some(
            (s) => String(s).toLowerCase() === String(tag.id).toLowerCase() || String(s).toLowerCase() === tagKey.toLowerCase(),
          )
          const count = counts[tag.id] ?? counts[tagKey.toLowerCase()] ?? 0
          const dotColor = sanitizeHexColor(tag.hexColor || tag.color, '#6B7280')

          return (
            <li key={tag.id ?? tagKey}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(tagKey, tag)}
                className={`flex h-9 w-full items-center gap-2.5 rounded-lg border px-2.5 text-left text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                  active ? 'border-line bg-surface shadow-whisper' : 'border-transparent hover:bg-surface/60'
                }`}
              >
                <TagDot color={dotColor} />
                <span className="flex-1 truncate text-ink">
                  <span className="text-ink-faint">#</span>
                  {cleanLabel}
                </span>
                {active ? (
                  <IconCheck size={14} strokeWidth={2.25} className="text-accent" />
                ) : (
                  <span className="text-[12px] text-ink-faint tabular-nums">{count || ''}</span>
                )}
              </button>
            </li>
          )
        })}
        {hasMore && <li ref={sentinelRef} className="h-2 w-full" aria-hidden="true" />}
      </ul>
    </section>
  )
}
