import { httpClient } from '../../../shared/api/httpClient'

export const contactoService = {
  /**
   * GET /agenda/contactos/cursor?id={id}&limit={limit}
   */
  obtenerPorCursor: ({ id = 0, limit = 10, signal } = {}) =>
    httpClient.get('/agenda/contactos/cursor', {
      params: { id, limit },
      signal,
    }),

  /**
   * GET /agenda/contactos/nombre?nombre={nombre}
   * Captura silenciosamente 404 NOT_FOUND devolviendo [].
   */
  buscarPorNombre: (nombre, { signal } = {}) => {
    const trimmed = String(nombre || '').trim()
    if (!trimmed) return Promise.resolve([])
    return httpClient.get('/agenda/contactos/nombre', {
      params: { nombre: trimmed },
      emptyOn404: true,
      signal,
    })
  },

  /**
   * GET /agenda/contactos/etiqueta?etiqueta={etiqueta}
   * Captura silenciosamente 404 NOT_FOUND devolviendo [].
   */
  buscarPorEtiqueta: (etiqueta, { signal } = {}) => {
    const trimmed = String(etiqueta || '').trim()
    if (!trimmed) return Promise.resolve([])
    return httpClient.get('/agenda/contactos/etiqueta', {
      params: { etiqueta: trimmed },
      emptyOn404: true,
      signal,
    })
  },

  /**
   * GET /agenda/contactos/{id}
   */
  obtenerPorId: (id, { signal } = {}) =>
    httpClient.get(`/agenda/contactos/${id}`, { signal }),

  /**
   * POST /agenda/contactos
   */
  crearContacto: (payload) => httpClient.post('/agenda/contactos', payload),

  /**
   * PUT /agenda/contactos/{id} (Actualización atómica completa)
   */
  actualizarContacto: (id, payload) =>
    httpClient.put(`/agenda/contactos/${id}`, payload),
}
