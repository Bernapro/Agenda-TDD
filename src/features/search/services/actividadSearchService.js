import { httpClient } from '../../../shared/api/httpClient'

export const actividadSearchService = {
  /**
   * GET /agenda/actividades/titulo?titulo={titulo}
   * Captura silenciosamente 404 NOT_FOUND devolviendo [].
   */
  buscarPorTitulo: (titulo, { signal } = {}) => {
    const trimmed = String(titulo || '').trim()
    if (!trimmed) return Promise.resolve([])
    return httpClient.get('/agenda/actividades/titulo', {
      params: { titulo: trimmed },
      emptyOn404: true,
      signal,
    })
  },

  /**
   * GET /agenda/actividades/etiqueta?etiqueta={etiqueta}
   * Captura silenciosamente 404 NOT_FOUND devolviendo [].
   */
  buscarPorEtiqueta: (etiqueta, { signal } = {}) => {
    const trimmed = String(etiqueta || '').trim()
    if (!trimmed) return Promise.resolve([])
    return httpClient.get('/agenda/actividades/etiqueta', {
      params: { etiqueta: trimmed },
      emptyOn404: true,
      signal,
    })
  },

  /**
   * GET /agenda/actividades/mes?fecha=YYYY-MM-01
   * Devuelve las actividades desde el día 1 del mes hasta el día 7 del mes siguiente.
   * Captura silenciosamente 404 NOT_FOUND devolviendo [].
   */
  obtenerPorMes: (fechaISO, { signal } = {}) =>
    httpClient.get('/agenda/actividades/mes', {
      params: { fecha: fechaISO },
      emptyOn404: true,
      signal,
    }),
}
