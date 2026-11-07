import { useCallback, useRef, useState } from 'react'
import { IconSearch, IconUsers, IconX } from '../../../shared/components/icons'
import { useDismiss } from '../../../shared/hooks/useDismiss'
import { useContactSearchDebounce } from '../hooks/useContactSearchDebounce'

function formatContactFullName(c) {
  return [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ').trim() || 'Contacto'
}

export function ContactSearchSelect({ value = [], onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(containerRef, open, close)

  const { results, loading } = useContactSearchDebounce(query)

  const selectedIds = new Set(value.map((item) => item.idContacto))

  const handleSelectContact = (contacto) => {
    if (!contacto?.id || selectedIds.has(contacto.id)) {
      setQuery('')
      setOpen(false)
      return
    }
    const next = [
      ...value,
      {
        idContacto: contacto.id,
        notaParticipacion: 'Invitado',
        nombreCompleto: formatContactFullName(contacto),
        apodo: contacto.apodo || '',
      },
    ]
    onChange(next)
    setQuery('')
    setOpen(false)
  }

  const handleRemove = (idContacto) => {
    onChange(value.filter((item) => item.idContacto !== idContacto))
  }

  const handleNoteChange = (idContacto, notaParticipacion) => {
    onChange(
      value.map((item) => (item.idContacto === idContacto ? { ...item, notaParticipacion } : item)),
    )
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-canvas px-3 focus-within:border-accent/50 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/15">
          <IconSearch size={14} className="text-ink-soft" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            placeholder="Buscar contacto por nombre o apodo..."
            className="flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint"
          />
          {loading && <span className="text-[11.5px] text-ink-faint">Buscando…</span>}
        </div>

        {showDropdown && (
          <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-float">
            {!loading && results.length === 0 ? (
              <p className="px-3 py-2.5 text-[12.5px] text-ink-soft">Sin coincidencias para “{query.trim()}”.</p>
            ) : (
              results.map((c) => {
                const alreadyAdded = selectedIds.has(c.id)
                const fullName = formatContactFullName(c)
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleSelectContact(c)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <IconUsers size={14} className="shrink-0 text-ink-soft" />
                      <span className="truncate font-medium text-ink">{fullName}</span>
                      {c.apodo && <span className="truncate text-[12px] text-ink-soft">({c.apodo})</span>}
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      {alreadyAdded ? 'Agregado' : `+ Añadir`}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((participant) => (
            <li
              key={participant.idContacto}
              className="flex items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-[12.5px]"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-ink">
                {participant.nombreCompleto || `Contacto #${participant.idContacto}`}
              </span>
              <input
                type="text"
                value={participant.notaParticipacion || ''}
                onChange={(e) => handleNoteChange(participant.idContacto, e.target.value)}
                placeholder="Rol / nota"
                className="h-6 w-28 rounded border border-line bg-surface px-2 text-[12px] text-ink-soft outline-none focus:border-accent/50 focus:text-ink"
              />
              <button
                type="button"
                onClick={() => handleRemove(participant.idContacto)}
                aria-label="Quitar participante"
                className="grid h-6 w-6 place-items-center rounded text-ink-soft hover:bg-surface hover:text-ink"
              >
                <IconX size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
