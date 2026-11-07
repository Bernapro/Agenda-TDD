import { sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'

export function TagDot({ color, size = 8 }) {
  const safeColor = sanitizeHexColor(color, '#6B7280')
  return <span className="shrink-0 rounded-full" style={{ width: size, height: size, backgroundColor: safeColor }} />
}

/**
 * Pastilla compacta #Etiqueta usada en las filas de la línea de tiempo.
 * Aplica stripLeadingHash para quitar el '#' que ya viene desde PostgreSQL antes de anteponer el '#' estilizado.
 */
export function TagPill({ tag }) {
  if (!tag) return null
  const cleanLabel = stripLeadingHash(tag.nombre || tag.label || '')
  if (!cleanLabel) return null
  const color = sanitizeHexColor(tag.hexColor || tag.color, '#6B7280')

  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2 text-[12px] text-ink-soft">
      <TagDot color={color} size={6} />
      <span>
        <span className="text-ink-faint">#</span>
        {cleanLabel}
      </span>
    </span>
  )
}

export function TagPillList({ etiquetas }) {
  if (!Array.isArray(etiquetas) || etiquetas.length === 0) return null
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {etiquetas.map((t, idx) => (
        <TagPill key={t.id ?? `${t.nombre}-${idx}`} tag={t} />
      ))}
    </div>
  )
}
