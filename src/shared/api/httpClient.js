export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const SILENT_404_PATHS = [
  '/agenda/contactos/nombre',
  '/agenda/contactos/etiqueta',
  '/agenda/actividades/titulo',
  '/agenda/actividades/etiqueta',
  '/agenda/actividades/mes',
  '/agenda/tareas/subtareas',
  '/agenda/etiquetas/nombre',
]

export class ApiError extends Error {
  constructor({ status, mensaje, detalles, codigoHttp }) {
    super(mensaje || `Error HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.mensaje = mensaje || `Error HTTP ${status}`
    this.detalles = detalles || ''
    this.codigoHttp = codigoHttp || String(status)
  }
}

function isSilent404Endpoint(path, emptyOn404) {
  if (emptyOn404) return true
  const cleanPath = path.split('?')[0]
  return SILENT_404_PATHS.some((p) => cleanPath === p || cleanPath.endsWith(p))
}

/**
 * Cliente HTTP centralizado para consumir la API REST de Spring Boot (/agenda/...).
 * Extrae `errorBody?.mensaje` de `ErrorDetalles` y maneja silenciosamente los 404 de búsqueda vacía.
 */
export async function httpRequest(path, { method = 'GET', params, body, headers = {}, emptyOn404 = false, signal } = {}) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`)

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const init = {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  }

  let response
  try {
    response = await fetch(url.toString(), init)
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new ApiError({
      status: 0,
      mensaje: 'No se pudo conectar con el servidor de Agenda (http://localhost:8080). Verifica que el backend en Spring Boot esté activo.',
      detalles: err?.message || '',
      codigoHttp: 'NETWORK_ERROR',
    })
  }

  if (response.status === 404 && isSilent404Endpoint(path, emptyOn404)) {
    return []
  }

  const text = await response.text()
  let parsed = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      mensaje: parsed?.mensaje || parsed?.message || `Error en la solicitud (${response.status})`,
      detalles: parsed?.detalles || '',
      codigoHttp: parsed?.codigoHttp || String(response.status),
    })
  }

  return parsed
}

export const httpClient = {
  get: (path, options = {}) => httpRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => httpRequest(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => httpRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => httpRequest(path, { ...options, method: 'DELETE' }),
}

/**
 * En PostgreSQL, hex_color es CHAR(7) con constraint ^#[0-9A-Fa-f]{6}$.
 * Siempre aplica .trim() y garantiza un hexadecimal válido.
 */
export function sanitizeHexColor(hexColor, fallback = '#3B82F6') {
  if (!hexColor || typeof hexColor !== 'string') return fallback
  const trimmed = hexColor.trim()
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : fallback
}

/**
 * Quita el '#' inicial de etiqueta.nombre (ej. "#Trabajo" -> "Trabajo")
 * antes de anteponer el <span className="text-ink-faint">#</span> del diseño.
 */
export function stripLeadingHash(nombre = '') {
  if (!nombre || typeof nombre !== 'string') return ''
  return nombre.trim().replace(/^#+/, '')
}

/**
 * Normaliza el nombre de una etiqueta para cumplir el CHECK de PostgreSQL:
 * ^#[a-zA-Z0-9!()_-]+$ y longitud máxima de 50 caracteres.
 */
export function normalizeTagNameForDb(rawName = '') {
  const withoutHash = stripLeadingHash(rawName)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9!()_-]/g, '')
  if (!withoutHash) return ''
  return `#${withoutHash}`.slice(0, 50)
}
