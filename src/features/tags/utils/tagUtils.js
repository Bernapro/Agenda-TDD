import { sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'

/**
 * Normaliza texto para comparaciones de búsqueda: sin '#', sin acentos y en minúsculas.
 */
export function normalizeTagSearchText(value = '') {
  return stripLeadingHash(String(value || ''))
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/**
 * Adapta cualquier EtiquetaGetDTO / etiqueta local al formato de UI:
 * { id, nombre: '#Etiqueta', label: 'Etiqueta', hexColor: '#RRGGBB' }
 */
export function adaptTag(dto, fallbackColor = '#6B7280') {
  const label = stripLeadingHash(dto?.nombre || dto?.label || '')
  if (!label) return null
  return {
    id: dto?.id ?? label.toLowerCase(),
    nombre: `#${label}`,
    label,
    hexColor: sanitizeHexColor(dto?.hexColor || dto?.color, fallbackColor),
  }
}

/** Clave única de una etiqueta para deduplicar (nombre en minúsculas, sin '#'). */
export function tagKey(tag) {
  return stripLeadingHash(tag?.nombre || tag?.label || '').toLowerCase()
}

/**
 * Une listas de etiquetas sin duplicar por nombre.toLowerCase(); conserva la primera aparición.
 */
export function mergeUniqueTags(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const raw of list || []) {
      const tag = adaptTag(raw)
      if (!tag) continue
      const key = tagKey(tag)
      if (!map.has(key)) map.set(key, tag)
    }
  }
  return Array.from(map.values())
}

/**
 * Filtra en memoria por subcadena insensible a mayúsculas/acentos.
 */
export function filterTagsBySubstring(tags = [], query = '') {
  const clean = normalizeTagSearchText(query)
  if (!clean) return []
  return tags.filter((t) => normalizeTagSearchText(t?.nombre || t?.label).includes(clean))
}
