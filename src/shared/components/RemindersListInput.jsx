import { IconBell, IconPlus, IconX } from './icons'

const UNIDADES = [
  { value: 'MINUTOS', label: 'Minutos antes' },
  { value: 'HORAS', label: 'Horas antes' },
  { value: 'DIAS', label: 'Días antes' },
  { value: 'SEMANAS', label: 'Semanas antes' },
]

export function RemindersListInput({ value = [], onChange }) {
  const handleAdd = () => {
    onChange([...value, { tiempoAnticipacion: 15, unidadTiempo: 'MINUTOS' }])
  }

  const handleRemove = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleChange = (index, patch) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
          <IconBell size={13} />
          Recordatorios
        </span>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <IconPlus size={12} strokeWidth={2.25} />
          Añadir recordatorio
        </button>
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((rem, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={rem.tiempoAnticipacion}
                onChange={(e) =>
                  handleChange(idx, { tiempoAnticipacion: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="h-9 w-24 rounded-lg border border-line bg-canvas px-2.5 text-[13px] text-ink tabular-nums outline-none focus:border-accent/50 focus:bg-surface"
              />
              <select
                value={rem.unidadTiempo}
                onChange={(e) => handleChange(idx, { unidadTiempo: e.target.value })}
                className="h-9 flex-1 rounded-lg border border-line bg-canvas px-2.5 text-[13px] text-ink outline-none focus:border-accent/50 focus:bg-surface"
              >
                {UNIDADES.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label="Eliminar recordatorio"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-panel hover:text-ink"
              >
                <IconX size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
