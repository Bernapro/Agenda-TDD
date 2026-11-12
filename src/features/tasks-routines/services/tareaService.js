import { httpClient } from '../../../shared/api/httpClient'

export const tareaService = {
  /**
   * GET /agenda/tareas/cursor?id={id}&limit={limit}&fechaInicio={fechaInicio}&fechaFin={fechaFin}
   */
  obtenerPorCursor: ({ id = 0, limit = 10, fechaInicio, fechaFin, signal }) =>
    httpClient.get('/agenda/tareas/cursor', {
      params: { id, limit, fechaInicio, fechaFin },
      signal,
    }),

  /**
   * POST /agenda/tareas
   * Crea tanto Tareas (fechaLimite != null) como Rutinas (fechaLimite === null).
   */
  crearTareaORutina: (payload) => httpClient.post('/agenda/tareas', payload),

  /**
   * GET /agenda/tareas/{id}
   */
  obtenerPorId: (id, { signal } = {}) => httpClient.get(`/agenda/tareas/${id}`, { signal }),

  /**
   * PUT /agenda/tareas/{id}
   * Actualiza atómicamente tanto Tareas (fechaLimite != null) como Rutinas (fechaLimite === null).
   */
  actualizarTareaORutina: (id, payload) => httpClient.put(`/agenda/tareas/${id}`, payload),

  /**
   * GET /agenda/tareas/subtareas?id={id}
   */
  obtenerSubtareas: (id) =>
    httpClient.get('/agenda/tareas/subtareas', {
      params: { id },
      emptyOn404: true,
    }),

  /**
   * POST /agenda/tareas/sesion
   */
  registrarSesion: (payload) => httpClient.post('/agenda/tareas/sesion', payload),
}
