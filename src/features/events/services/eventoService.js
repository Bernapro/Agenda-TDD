import { httpClient } from '../../../shared/api/httpClient'

export const eventoService = {
  /**
   * GET /agenda/eventos/cursor?id={id}&limit={limit}&fechaInicio={fechaInicio}&fechaFin={fechaFin}
   */
  obtenerPorCursor: ({ id = 0, limit = 10, fechaInicio, fechaFin, signal }) =>
    httpClient.get('/agenda/eventos/cursor', {
      params: { id, limit, fechaInicio, fechaFin },
      signal,
    }),

  /**
   * POST /agenda/eventos
   */
  crearEvento: (payload) => httpClient.post('/agenda/eventos', payload),

  /**
   * GET /agenda/eventos/{id}
   */
  obtenerPorId: (id) => httpClient.get(`/agenda/eventos/${id}`),
}
