import { DB_WEEKDAY_CODES, MONTHS } from '../../features/agenda-board/utils/dateRangeCalculator'

const FRECUENCIAS = [
  { value: 'DIARIA', label: 'Diaria' },
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'ANUAL', label: 'Anual' },
]

const inputCls =
  'h-9 w-full rounded-lg border border-line bg-canvas px-2.5 text-[13px] text-ink outline-none transition-colors focus:border-accent/50 focus:bg-surface focus:ring-2 focus:ring-accent/15'

export function RecurrenceFields({ enabled, onToggleEnabled, value, onChange, baseDate }) {
  const rec = value || {
    frecuencia: 'SEMANAL',
    intervalo: 1,
    diasSemana: 'LUN,MIE,VIE',
    diaMes: 1,
    mesAnio: 1,
    fechaInicio: baseDate,
    fechaFin: '',
  }

  const update = (patch) => {
    onChange({
      ...rec,
      fechaInicio: rec.fechaInicio || baseDate,
      ...patch,
    })
  }

  const selectedDays = new Set(
    String(rec.diasSemana || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )

  const toggleDayCode = (code) => {
    const next = new Set(selectedDays)
    if (next.has(code)) {
      if (next.size > 1) next.delete(code)
    } else {
      next.add(code)
    }
    const ordered = DB_WEEKDAY_CODES.filter((c) => next.has(c)).join(',')
    update({ diasSemana: ordered.slice(0, 20) })
  }

  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink-soft">Repetir actividad (Recurrencia)</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
      </div>

      {enabled && (
        <div className="mt-3 space-y-3 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-ink-soft">Frecuencia</span>
              <select
                value={rec.frecuencia}
                onChange={(e) => update({ frecuencia: e.target.value })}
                className={inputCls}
              >
                {FRECUENCIAS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11.5px] text-ink-soft">Intervalo (cada N)</span>
              <input
                type="number"
                min={1}
                max={99}
                value={rec.intervalo ?? 1}
                onChange={(e) => update({ intervalo: Math.max(1, Number(e.target.value) || 1) })}
                className={`${inputCls} tabular-nums`}
              />
            </label>
          </div>

          {rec.frecuencia === 'SEMANAL' && (
            <div>
              <span className="mb-1 block text-[11.5px] text-ink-soft">Días de la semana</span>
              <div className="flex flex-wrap gap-1.5">
                {DB_WEEKDAY_CODES.map((code) => {
                  const active = selectedDays.has(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleDayCode(code)}
                      className={`h-7 rounded-md border px-2 text-[11.5px] font-medium transition-colors ${
                        active
                          ? 'border-accent bg-accent text-white'
                          : 'border-line bg-surface text-ink-soft hover:text-ink'
                      }`}
                    >
                      {code}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {rec.frecuencia === 'MENSUAL' && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-ink-soft">Día del mes (1–31)</span>
              <input
                type="number"
                min={1}
                max={31}
                value={rec.diaMes ?? 1}
                onChange={(e) => update({ diaMes: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                className={`${inputCls} tabular-nums`}
              />
            </label>
          )}

          {rec.frecuencia === 'ANUAL' && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[11.5px] text-ink-soft">Día del mes (1–31)</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={rec.diaMes ?? 1}
                  onChange={(e) => update({ diaMes: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
                  className={`${inputCls} tabular-nums`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] text-ink-soft">Mes del año</span>
                <select
                  value={rec.mesAnio ?? 1}
                  onChange={(e) => update({ mesAnio: Number(e.target.value) || 1 })}
                  className={inputCls}
                >
                  {MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-[11.5px] text-ink-soft">Fecha fin de recurrencia (opcional)</span>
            <input
              type="date"
              min={baseDate}
              value={rec.fechaFin || ''}
              onChange={(e) => update({ fechaFin: e.target.value || null })}
              className={`${inputCls} tabular-nums`}
            />
          </label>
        </div>
      )}
    </div>
  )
}
