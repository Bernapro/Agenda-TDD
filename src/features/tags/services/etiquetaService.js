import { httpClient, stripLeadingHash } from '../../../shared/api/httpClient'
import { filterTagsBySubstring, mergeUniqueTags } from '../utils/tagUtils'

const FALLBACK_CURSOR_LIMIT = 50

function isAbort(err) {
  return err?.name === 'AbortError'
}

export const etiquetaService = {
  /**
   * GET /agenda/etiquetas/etiquetaCursor?id={id}&limit={limit}
   */
  obtenerPorCursor: ({ id = 0, limit = 10, signal } = {}) =>
    httpClient.get('/agenda/etiquetas/etiquetaCursor', {
      params: { id, limit },
      signal,
    }),

  /**
   * Búsqueda resiliente de etiquetas por nombre.
   *
   * 1. Consume GET /agenda/etiquetas/nombre?nombre={texto} (un 404 se devuelve como []).
   * 2. Si el endpoint no está disponible (404 de ruta inexistente, 500, etc.) o no trae
   *    coincidencias, recurre a /agenda/etiquetas/etiquetaCursor?id=0&limit=50 y filtra en memoria.
   * 3. Siempre combina con las coincidencias locales de `availableTags`, sin duplicar por nombre.
   */
  buscarPorNombre: async (nombre, { availableTags = [], signal } = {}) => {
    const termino = stripLeadingHash(String(nombre || '').trim()).slice(0, 50)
    if (!termino) return []

    const localMatches = filterTagsBySubstring(availableTags, termino)

    let remoteMatches = []
    try {
      const data = await httpClient.get('/agenda/etiquetas/nombre', {
        params: { nombre: termino },
        emptyOn404: true,
        signal,
      })
      remoteMatches = Array.isArray(data) ? data : []
    } catch (err) {
      if (isAbort(err)) throw err
      remoteMatches = []
    }

    if (remoteMatches.length === 0) {
      try {
        const page = await etiquetaService.obtenerPorCursor({ id: 0, limit: FALLBACK_CURSOR_LIMIT, signal })
        remoteMatches = filterTagsBySubstring(Array.isArray(page) ? page : [], termino)
      } catch (err) {
        if (isAbort(err)) throw err
        remoteMatches = []
      }
    }

    return mergeUniqueTags(remoteMatches, localMatches)
  },
}
