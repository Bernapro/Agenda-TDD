/**
 * Distinción entre Tarea y Rutina según el contrato de TareaGetResumenDTO:
 * - Si fechaLimite !== null -> TAREA (kind: 'task')
 * - Si fechaLimite === null -> RUTINA (kind: 'routine')
 */
export function isRoutineRecord(tareaDto) {
  return tareaDto?.fechaLimite === null || tareaDto?.fechaLimite === undefined
}

export function resolveTaskOrRoutineKind(tareaDto) {
  return isRoutineRecord(tareaDto) ? 'routine' : 'task'
}

/**
 * Calcula la diferencia en días completos entre la fecha actual (new Date()) y fechaInicio.
 */
export function calcularDiasDesdeInicio(fechaInicioISO) {
  if (!fechaInicioISO) return 0
  const inicio = new Date(fechaInicioISO)
  const hoy = new Date()
  const inicioUTC = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diffDias = Math.floor((hoyUTC - inicioUTC) / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDias)
}
