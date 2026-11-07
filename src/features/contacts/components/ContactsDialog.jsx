import { useRef, useState } from 'react'
import { Dialog, DialogHeader } from '../../../shared/components/Dialog'
import { IconPlus, IconSearch, IconStar } from '../../../shared/components/icons'
import { useIntersectionObserver } from '../../../shared/hooks/useIntersectionObserver'
import { useInfiniteContacts } from '../hooks/useInfiniteContacts'
import { contactoService } from '../services/contactoService'

const AVATAR_HUES = ['#3B82F6', '#8B5CF6', '#D97706', '#0E9FB8', '#E0607E', '#2E6F5E']

function getContactInitials(c) {
  const parts = [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean)
  if (!parts.length) return 'C'
  return parts
    .slice(0, 2)
    .map((p) => p.trim()[0]?.toUpperCase() || '')
    .join('')
}

function getContactFullName(c) {
  return [c.nombre, c.apellidoPaterno, c.apellidoMaterno].filter(Boolean).join(' ').trim() || 'Contacto'
}

export function ContactsDialog({ onClose, onContactCreated }) {
  const {
    contacts,
    hasMore,
    loading,
    searchQuery,
    setSearchQuery,
    loadMoreContacts,
    refreshContacts,
  } = useInfiniteContacts()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [apodo, setApodo] = useState('')
  const [favorito, setFavorito] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const listRef = useRef(null)
  const sentinelRef = useIntersectionObserver({
    onIntersect: () => loadMoreContacts(),
    enabled: Boolean(hasMore && !searchQuery.trim()),
    rootRef: listRef,
    rootMargin: '40px',
  })

  const handleScroll = (e) => {
    if (!hasMore || searchQuery.trim()) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight <= 24) {
      loadMoreContacts()
    }
  }

  const handleCreateContact = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!nombre.trim()) {
      setFormError('El nombre del contacto es obligatorio.')
      return
    }
    setSaving(true)
    try {
      await contactoService.crearContacto({
        nombre: nombre.trim().slice(0, 100),
        apellidoPaterno: apellidoPaterno.trim().slice(0, 100) || null,
        apellidoMaterno: apellidoMaterno.trim().slice(0, 100) || null,
        apodo: apodo.trim().slice(0, 50) || null,
        favorito,
        direcciones: [],
        noTelefonicos: [],
        correosElectronicos: [],
        etiquetas: [],
      })
      setNombre('')
      setApellidoPaterno('')
      setApellidoMaterno('')
      setApodo('')
      setFavorito(false)
      setShowCreateForm(false)
      refreshContacts()
      onContactCreated?.()
    } catch (err) {
      setFormError(err?.mensaje || err?.message || 'Error al guardar el contacto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="contacts-title" width="max-w-[500px]">
      <DialogHeader
        id="contacts-title"
        title="Contactos"
        subtitle={`${contacts.length} ${contacts.length === 1 ? 'persona' : 'personas'} en tu agenda`}
        onClose={onClose}
      />

      <div className="space-y-3 px-6 pt-4">
        <div className="flex items-center gap-2">
          <label className="flex h-10 flex-1 items-center gap-2.5 rounded-lg border border-line bg-canvas px-3 focus-within:border-accent/50 focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/15">
            <IconSearch size={15} className="text-ink-soft" />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contacto por nombre o apodo..."
              className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((v) => !v)
              setFormError(null)
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none"
          >
            <IconPlus size={14} strokeWidth={2.25} />
            Nuevo
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreateContact} className="space-y-2.5 rounded-xl border border-line bg-canvas p-3">
            {formError && <p className="text-[12px] text-red-600">{formError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                maxLength={100}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre *"
                className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              />
              <input
                maxLength={50}
                value={apodo}
                onChange={(e) => setApodo(e.target.value)}
                placeholder="Apodo"
                className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                maxLength={100}
                value={apellidoPaterno}
                onChange={(e) => setApellidoPaterno(e.target.value)}
                placeholder="Apellido paterno"
                className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              />
              <input
                maxLength={100}
                value={apellidoMaterno}
                onChange={(e) => setApellidoMaterno(e.target.value)}
                placeholder="Apellido materno"
                className="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={favorito}
                  onChange={(e) => setFavorito(e.target.checked)}
                  className="h-3.5 w-3.5 accent-accent"
                />
                Marcar como favorito
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="h-8 rounded-lg px-2.5 text-[12.5px] text-ink-soft hover:bg-panel hover:text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 rounded-lg bg-accent px-3 text-[12.5px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <ul
        ref={listRef}
        onScroll={handleScroll}
        className="scrollbar-subtle max-h-[340px] overflow-y-auto px-3 py-3"
      >
        {contacts.map((c, idx) => {
          const hue = AVATAR_HUES[(c.id ?? idx) % AVATAR_HUES.length]
          const fullName = getContactFullName(c)
          return (
            <li key={c.id ?? idx} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-canvas">
              {c.avatar ? (
                <img
                  src={c.avatar}
                  alt={fullName}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
                  style={{ backgroundColor: `${hue}1A`, color: hue }}
                >
                  {getContactInitials(c)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] text-ink">
                  <span className="truncate font-medium">{fullName}</span>
                  {c.favorito && <IconStar size={13} className="shrink-0 fill-task text-task" />}
                </span>
                {c.apodo && (
                  <span className="block truncate text-[12.5px] text-ink-soft">
                    Apodo: {c.apodo}
                  </span>
                )}
              </span>
            </li>
          )
        })}

        {!loading && contacts.length === 0 && (
          <li className="py-8 text-center text-[13.5px] text-ink-soft">
            {searchQuery.trim() ? `Sin coincidencias para “${searchQuery.trim()}”.` : 'No hay contactos registrados.'}
          </li>
        )}

        {hasMore && !searchQuery.trim() && (
          <li ref={sentinelRef} className="py-2 text-center text-[12px] text-ink-faint">
            {loading ? 'Cargando contactos…' : ''}
          </li>
        )}
      </ul>
    </Dialog>
  )
}
