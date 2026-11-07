import { httpClient } from '../../../shared/api/httpClient'

export const etiquetaService = {
  /**
   * GET /agenda/etiquetas/etiquetaCursor?id={id}&limit={limit}
   */
  obtenerPorCursor: ({ id = 0, limit = 10, signal } = {}) =>
    httpClient.get('/agenda/etiquetas/etiquetaCursor', {
      params: { id, limit },
      signal,
    }),
}
