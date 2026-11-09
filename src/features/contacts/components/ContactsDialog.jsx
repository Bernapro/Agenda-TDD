import { useMemo, useRef, useState } from 'react'
import { normalizeTagNameForDb, sanitizeHexColor, stripLeadingHash } from '../../../shared/api/httpClient'
import { Dialog, DialogHeader } from '../../../shared/components/Dialog'
import { IconHeart, IconPlus, IconSearch, IconStar, IconX } from '../../../shared/components/icons'
import { useIntersectionObserver } from '../../../shared/hooks/useIntersectionObserver'
import { TagDot } from '../../tags/components/TagPill'
import { DEFAULT_PRESET_TAGS } from '../../tags/hooks/useInfiniteTags'
import { useInfiniteContacts } from '../hooks/useInfiniteContacts'
import { contactoService } from '../services/contactoService'

const AVATAR_HUES = ['#3B82F6', '#8B5CF6', '#D97706', '#0E9FB8', '#E0607E', '#2E6F5E']

const TIPOS_TELEFONO = ['Móvil', 'Casa', 'Trabajo', 'Otro']
const TIPOS_CORREO = ['Personal', 'Trabajo', 'Estudio', 'Otro']
const TIPOS_DIRECCION = ['Casa', 'Trabajo', 'Otro']

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

function getInputClasses(hasError = false) {
  return hasError
    ? 'h-9 w-full rounded-lg border border-danger/70 bg-danger-soft/80 px-2.5 text-[13px] text-ink placeholder:text-danger/60 outline-none transition-colors focus:border-danger focus:ring-2 focus:ring-danger/20'
    : 'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/50 focus:ring-2 focus:ring-accent/15'
}

function getTextareaClasses(hasError = false) {
  return hasError
    ? 'w-full rounded-lg border border-danger/70 bg-danger-soft/80 p-2.5 text-[13px] text-ink placeholder:text-danger/60 outline-none transition-colors focus:border-danger focus:ring-2 focus:ring-danger/20'
    : 'w-full rounded-lg border border-line bg-surface p-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/50 focus:ring-2 focus:ring-accent/15'
}

const DEFAULT_INITIAL_PHONE = () => [{ prefijo: '+52', noTelefonico: '', tipo: 'Móvil' }]

export function ContactsDialog({ availableTags = [], onClose, onContactCreated }) {
  const {
    contacts,
    hasMore,
    loading,
    searchQuery,
    setSearchQuery,
    loadMoreContacts,
    refreshContacts,
  } = useInfiniteContacts()

  // Control de formulario inline
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  // 1. Identidad Básica (Orden estricto: 1. Nombre, 2. Apellido paterno, 3. Apellido materno, 4. Apodo)
  const [nombre, setNombre] = useState('')
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [apodo, setApodo] = useState('')

  // 2. Canales y ubicaciones (Un teléfono por defecto precargado)
  const [noTelefonicos, setNoTelefonicos] = useState(DEFAULT_INITIAL_PHONE)
  const [correosElectronicos, setCorreosElectronicos] = useState([])
  const [direcciones, setDirecciones] = useState([])

  // 3. Trabajo y Perfil
  const [empresa, setEmpresa] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [puesto, setPuesto] = useState('')

  // 4. Fechas, Avatar, Notas y Favorito
  const [cumpleanos, setCumpleanos] = useState('')
  const [avatar, setAvatar] = useState('')
  const [notas, setNotas] = useState('')
  const [favorito, setFavorito] = useState(false)

  // 5. Etiquetas
  const mergedTags = useMemo(() => {
    const map = new Map()
    for (const t of [...DEFAULT_PRESET_TAGS, ...availableTags]) {
      const label = stripLeadingHash(t.nombre || t.label || '')
      if (!label) continue
      const key = label.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          id: t.id ?? key,
          nombre: `#${label}`,
          label,
          hexColor: sanitizeHexColor(t.hexColor || t.color, '#3B82F6'),
        })
      }
    }
    return Array.from(map.values())
  }, [availableTags])

  const [selectedTagNames, setSelectedTagNames] = useState([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [customTags, setCustomTags] = useState([])

  const allTagOptions = useMemo(() => [...mergedTags, ...customTags], [mergedTags, customTags])

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

  // Limpieza en caliente de errores de campo en cuanto el usuario escribe
  const clearFieldError = (key) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      if (Object.keys(next).length === 0) {
        setFormError(null)
      }
      return next
    })
  }

  const resetFormState = () => {
    setNombre('')
    setApellidoPaterno('')
    setApellidoMaterno('')
    setApodo('')
    setNoTelefonicos(DEFAULT_INITIAL_PHONE())
    setCorreosElectronicos([])
    setDirecciones([])
    setEmpresa('')
    setDepartamento('')
    setPuesto('')
    setCumpleanos('')
    setAvatar('')
    setNotas('')
    setFavorito(false)
    setSelectedTagNames([])
    setCustomTagInput('')
    setFieldErrors({})
    setFormError(null)
  }

  const handleToggleForm = () => {
    setShowCreateForm((prev) => {
      const next = !prev
      if (!next) {
        resetFormState()
      }
      return next
    })
  }

  // Gestión de sub-formularios de teléfonos
  const handleAddTelefono = () => {
    setNoTelefonicos((prev) => [...prev, { prefijo: '+52', noTelefonico: '', tipo: 'Móvil' }])
  }

  const handleRemoveTelefono = (index) => {
    setNoTelefonicos((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors((prev) => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith(`telefono_${index}_`)) {
          next[k] = v
        }
      })
      return next
    })
  }

  const handleUpdateTelefono = (index, patch) => {
    setNoTelefonicos((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    )
    if (patch.noTelefonico !== undefined) clearFieldError(`telefono_${index}_numero`)
    if (patch.tipo !== undefined) clearFieldError(`telefono_${index}_tipo`)
    if (patch.prefijo !== undefined) clearFieldError(`telefono_${index}_numero`)
  }

  // Gestión de sub-formularios de correos
  const handleAddCorreo = () => {
    setCorreosElectronicos((prev) => [...prev, { direccion: '', tipo: 'Personal' }])
  }

  const handleRemoveCorreo = (index) => {
    setCorreosElectronicos((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors((prev) => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith(`correo_${index}_`)) {
          next[k] = v
        }
      })
      return next
    })
  }

  const handleUpdateCorreo = (index, patch) => {
    setCorreosElectronicos((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    )
    if (patch.direccion !== undefined) clearFieldError(`correo_${index}_direccion`)
    if (patch.tipo !== undefined) clearFieldError(`correo_${index}_tipo`)
  }

  // Gestión de sub-formularios de direcciones
  const handleAddDireccion = () => {
    setDirecciones((prev) => [
      ...prev,
      {
        direccion: '',
        segundaLinea: '',
        apartadoPostal: '',
        codigoPostal: '',
        ciudad: '',
        estado: '',
        pais: 'México',
        tipo: 'Casa',
      },
    ])
  }

  const handleRemoveDireccion = (index) => {
    setDirecciones((prev) => prev.filter((_, i) => i !== index))
    setFieldErrors((prev) => {
      const next = {}
      Object.entries(prev).forEach(([k, v]) => {
        if (!k.startsWith(`direccion_${index}_`)) {
          next[k] = v
        }
      })
      return next
    })
  }

  const handleUpdateDireccion = (index, patch) => {
    setDirecciones((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    )
    if (patch.direccion !== undefined) clearFieldError(`direccion_${index}_direccion`)
    if (patch.ciudad !== undefined) clearFieldError(`direccion_${index}_ciudad`)
    if (patch.estado !== undefined) clearFieldError(`direccion_${index}_estado`)
    if (patch.tipo !== undefined) clearFieldError(`direccion_${index}_tipo`)
  }

  // Etiquetas
  const toggleTagSelection = (tagObj) => {
    setSelectedTagNames((prev) => {
      const exists = prev.some((n) => n.toLowerCase() === tagObj.nombre.toLowerCase())
      return exists
        ? prev.filter((n) => n.toLowerCase() !== tagObj.nombre.toLowerCase())
        : [...prev, tagObj.nombre]
    })
  }

  const handleAddCustomTag = () => {
    const formatted = normalizeTagNameForDb(customTagInput)
    if (!formatted) return
    const label = stripLeadingHash(formatted)
    if (!allTagOptions.some((t) => t.nombre.toLowerCase() === formatted.toLowerCase())) {
      setCustomTags((prev) => [
        ...prev,
        { id: formatted.toLowerCase(), nombre: formatted, label, hexColor: '#3B82F6' },
      ])
    }
    setSelectedTagNames((prev) =>
      prev.some((n) => n.toLowerCase() === formatted.toLowerCase()) ? prev : [...prev, formatted],
    )
    setCustomTagInput('')
  }

  // Validación y Envío (POST /agenda/contactos)
  const handleCreateContact = async (e) => {
    e.preventDefault()
    setFormError(null)

    const errors = {}

    // 1. Validar nombre
    const trimmedNombre = nombre.trim()
    if (!trimmedNombre) {
      errors.nombre = 'El nombre es obligatorio.'
    } else if (trimmedNombre.length > 100) {
      errors.nombre = 'El nombre no puede exceder 100 caracteres.'
    }

    // 2. Validar teléfonos
    const seenTelefonos = new Set()
    noTelefonicos.forEach((t, i) => {
      const num = t.noTelefonico?.trim() || ''
      const pref = (t.prefijo?.trim() || '+52').toLowerCase()
      const tipo = t.tipo?.trim() || ''

      if (!num) {
        errors[`telefono_${i}_numero`] = 'El número telefónico es obligatorio (o quítalo con la X).'
      } else {
        const fullKey = `${pref}_${num.replace(/\s+/g, '')}`
        if (seenTelefonos.has(fullKey)) {
          errors[`telefono_${i}_numero`] = 'Número telefónico duplicado.'
        } else {
          seenTelefonos.add(fullKey)
        }
      }

      if (!tipo) {
        errors[`telefono_${i}_tipo`] = 'El tipo es obligatorio.'
      }
    })

    // 3. Validar correos
    const seenCorreos = new Set()
    correosElectronicos.forEach((c, i) => {
      const dir = c.direccion?.trim() || ''
      const tipo = c.tipo?.trim() || ''

      if (!dir || !dir.includes('@')) {
        errors[`correo_${i}_direccion`] = 'Ingresa un correo válido (debe incluir @).'
      } else {
        const lowerDir = dir.toLowerCase()
        if (seenCorreos.has(lowerDir)) {
          errors[`correo_${i}_direccion`] = 'Correo electrónico duplicado.'
        } else {
          seenCorreos.add(lowerDir)
        }
      }

      if (!tipo) {
        errors[`correo_${i}_tipo`] = 'El tipo es obligatorio.'
      }
    })

    // 4. Validar direcciones
    direcciones.forEach((d, i) => {
      if (!d.direccion?.trim()) {
        errors[`direccion_${i}_direccion`] = 'La calle y número son obligatorios.'
      }
      if (!d.ciudad?.trim()) {
        errors[`direccion_${i}_ciudad`] = 'La ciudad es obligatoria.'
      }
      if (!d.estado?.trim()) {
        errors[`direccion_${i}_estado`] = 'El estado / provincia es obligatorio.'
      }
      if (!d.tipo?.trim()) {
        errors[`direccion_${i}_tipo`] = 'El tipo de dirección es obligatorio.'
      }
    })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError('Por favor completa los campos obligatorios resaltados.')
      return
    }

    // Construcción del payload exacto de ContactoPostDTO
    const payload = {
      nombre: trimmedNombre,
      apellidoPaterno: apellidoPaterno.trim().slice(0, 100) || null,
      apellidoMaterno: apellidoMaterno.trim().slice(0, 100) || null,
      apodo: apodo.trim().slice(0, 50) || null,
      cumpleanos: cumpleanos || null,
      avatar: avatar.trim().slice(0, 255) || null,
      notas: notas.trim() || null,
      favorito: Boolean(favorito),
      empresa: empresa.trim().slice(0, 100) || null,
      departamento: departamento.trim().slice(0, 100) || null,
      puesto: puesto.trim().slice(0, 100) || null,
      direcciones: direcciones.map((d) => ({
        direccion: d.direccion.trim().slice(0, 150),
        segundaLinea: d.segundaLinea?.trim().slice(0, 150) || null,
        apartadoPostal: d.apartadoPostal?.trim().slice(0, 20) || null,
        codigoPostal: d.codigoPostal?.trim().slice(0, 15) || null,
        ciudad: d.ciudad.trim().slice(0, 100),
        estado: d.estado.trim().slice(0, 100),
        pais: d.pais?.trim().slice(0, 100) || 'México',
        tipo: d.tipo?.trim().slice(0, 30) || 'Casa',
      })),
      noTelefonicos: noTelefonicos.map((t) => ({
        prefijo: t.prefijo?.trim().slice(0, 10) || '+52',
        noTelefonico: t.noTelefonico.trim().slice(0, 20),
        tipo: t.tipo?.trim().slice(0, 30) || 'Móvil',
      })),
      correosElectronicos: correosElectronicos.map((c) => ({
        direccion: c.direccion.trim().slice(0, 150),
        tipo: c.tipo?.trim().slice(0, 30) || 'Personal',
      })),
      etiquetas: selectedTagNames
        .map((name) => {
          const found = allTagOptions.find((t) => t.nombre.toLowerCase() === name.toLowerCase())
          const clean = normalizeTagNameForDb(found?.nombre || name)
          if (!clean) return null
          return {
            nombre: clean,
            hexColor: sanitizeHexColor(found?.hexColor || '#3B82F6'),
          }
        })
        .filter(Boolean),
    }

    setSaving(true)
    try {
      await contactoService.crearContacto(payload)
      resetFormState()
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
    <Dialog onClose={onClose} labelledBy="contacts-title" width={showCreateForm ? 'max-w-[580px]' : 'max-w-[500px]'}>
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
              autoFocus={!showCreateForm}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contacto por nombre o apodo..."
              className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-faint"
            />
          </label>
          <button
            type="button"
            onClick={handleToggleForm}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none ${
              showCreateForm
                ? 'border border-line bg-surface text-ink-soft hover:bg-panel hover:text-ink'
                : 'bg-accent text-white hover:bg-accent-hover'
            }`}
          >
            {showCreateForm ? (
              <>
                <IconX size={14} />
                Cerrar
              </>
            ) : (
              <>
                <IconPlus size={14} strokeWidth={2.25} />
                Nuevo
              </>
            )}
          </button>
        </div>

        {/* Formulario Inline de Crear Contacto */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateContact}
            noValidate
            className="scrollbar-subtle max-h-[62vh] space-y-3.5 overflow-y-auto rounded-xl border border-line bg-canvas p-3.5 pr-2.5 transition-all animate-pop"
          >
            {formError && (
              <div role="alert" className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-[12.5px] text-danger">
                {formError}
              </div>
            )}

            {/* 1. Información Básica: Alineados, del mismo tamaño y en posiciones simétricas 2x2.
                Orden estricto: 1. Nombre, 2. Apellido paterno, 3. Apellido materno, 4. Apodo.
                A la altura de la etiqueta se ubica el botón de corazón para marcar como favorito */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                  Información básica
                </span>
                <button
                  type="button"
                  onClick={() => setFavorito((prev) => !prev)}
                  aria-label={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  title={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  className={`grid h-7 w-7 place-items-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                    favorito
                      ? 'text-danger bg-danger-soft hover:bg-danger/15'
                      : 'text-ink-faint hover:bg-panel hover:text-danger'
                  }`}
                >
                  <IconHeart size={16} filled={favorito} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Nombre */}
                <div>
                  <input
                    required
                    maxLength={100}
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value)
                      clearFieldError('nombre')
                    }}
                    placeholder="Nombre *"
                    className={getInputClasses(Boolean(fieldErrors.nombre))}
                  />
                  {fieldErrors.nombre && (
                    <p className="mt-1 text-[11.5px] font-medium text-danger">{fieldErrors.nombre}</p>
                  )}
                </div>

                {/* 2. Apellido paterno */}
                <div>
                  <input
                    maxLength={100}
                    value={apellidoPaterno}
                    onChange={(e) => setApellidoPaterno(e.target.value)}
                    placeholder="Apellido paterno"
                    className={getInputClasses(false)}
                  />
                </div>

                {/* 3. Apellido materno */}
                <div>
                  <input
                    maxLength={100}
                    value={apellidoMaterno}
                    onChange={(e) => setApellidoMaterno(e.target.value)}
                    placeholder="Apellido materno"
                    className={getInputClasses(false)}
                  />
                </div>

                {/* 4. Apodo */}
                <div>
                  <input
                    maxLength={50}
                    value={apodo}
                    onChange={(e) => setApodo(e.target.value)}
                    placeholder="Apodo"
                    className={getInputClasses(false)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Canales y ubicaciones (Directamente abajo de Identidad Básica; incluye 1 teléfono por defecto) */}
            <div className="space-y-3 border-t border-line pt-2.5">
              <span className="block text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                Canales y ubicaciones
              </span>

              {/* Botones de acción secundaria para agregar teléfono, dirección y correo (situados arriba) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddTelefono}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-3 text-[12.5px] font-medium text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                >
                  <IconPlus size={13} strokeWidth={2.25} />
                  {noTelefonicos.length > 0 ? 'Agregar otro teléfono' : 'Agregar teléfono'}
                </button>
                <button
                  type="button"
                  onClick={handleAddCorreo}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-3 text-[12.5px] font-medium text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                >
                  <IconPlus size={13} strokeWidth={2.25} />
                  {correosElectronicos.length > 0 ? 'Agregar otro correo' : 'Agregar correo'}
                </button>
                <button
                  type="button"
                  onClick={handleAddDireccion}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line bg-surface px-3 text-[12.5px] font-medium text-accent transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                >
                  <IconPlus size={13} strokeWidth={2.25} />
                  {direcciones.length > 0 ? 'Agregar otra dirección' : 'Agregar dirección'}
                </button>
              </div>

              {/* Apartado de Teléfonos (con 1 teléfono activo por defecto, abajo de los botones) */}
              {noTelefonicos.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="block text-[11.5px] font-medium text-ink-soft">Teléfonos</span>
                  {noTelefonicos.map((tel, idx) => {
                    const errorNum = fieldErrors[`telefono_${idx}_numero`]
                    const errorTipo = fieldErrors[`telefono_${idx}_tipo`]
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-line bg-surface p-2.5 transition-all animate-pop"
                      >
                        <div className="flex items-start gap-2">
                          {/* 1. Código de país: texto pequeño (máx 5 caracteres, "+52" por defecto) */}
                          <div className="w-16 shrink-0">
                            <input
                              type="text"
                              maxLength={5}
                              value={tel.prefijo}
                              onChange={(e) => handleUpdateTelefono(idx, { prefijo: e.target.value })}
                              placeholder="+52"
                              aria-label="Código de país"
                              title="Código de país (máx. 5 caracteres)"
                              className={`text-center font-mono !px-1.5 tabular-nums ${getInputClasses(false)}`}
                            />
                          </div>

                          {/* 2. Parte numérica: texto más grande */}
                          <div className="min-w-0 flex-1">
                            <input
                              type="tel"
                              required
                              maxLength={20}
                              value={tel.noTelefonico}
                              onChange={(e) => handleUpdateTelefono(idx, { noTelefonico: e.target.value })}
                              placeholder="Número telefónico *"
                              aria-label="Número telefónico"
                              className={`tabular-nums ${getInputClasses(Boolean(errorNum))}`}
                            />
                            {errorNum && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorNum}</p>
                            )}
                          </div>

                          {/* 3. ComboBox para seleccionar el tipo de teléfono */}
                          <div className="w-28 shrink-0">
                            <select
                              value={tel.tipo}
                              onChange={(e) => handleUpdateTelefono(idx, { tipo: e.target.value })}
                              aria-label="Tipo de teléfono"
                              className={`cursor-pointer ${getInputClasses(Boolean(errorTipo))}`}
                            >
                              {TIPOS_TELEFONO.map((tp) => (
                                <option key={tp} value={tp}>
                                  {tp}
                                </option>
                              ))}
                            </select>
                            {errorTipo && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorTipo}</p>
                            )}
                          </div>

                          {/* Botón quitar teléfono */}
                          <button
                            type="button"
                            onClick={() => handleRemoveTelefono(idx)}
                            aria-label="Quitar teléfono"
                            title="Quitar teléfono"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Lista dinámica de Correos Electrónicos */}
              {correosElectronicos.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="block text-[11.5px] font-medium text-ink-soft">Correos electrónicos</span>
                  {correosElectronicos.map((correo, idx) => {
                    const errorDir = fieldErrors[`correo_${idx}_direccion`]
                    const errorTipo = fieldErrors[`correo_${idx}_tipo`]
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-line bg-surface p-2.5 transition-all animate-pop"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <input
                              type="email"
                              required
                              maxLength={150}
                              value={correo.direccion}
                              onChange={(e) => handleUpdateCorreo(idx, { direccion: e.target.value })}
                              placeholder="correo@dominio.com *"
                              className={getInputClasses(Boolean(errorDir))}
                            />
                            {errorDir && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorDir}</p>
                            )}
                          </div>
                          <div className="w-28">
                            <select
                              value={correo.tipo}
                              onChange={(e) => handleUpdateCorreo(idx, { tipo: e.target.value })}
                              className={getInputClasses(Boolean(errorTipo))}
                            >
                              {TIPOS_CORREO.map((tp) => (
                                <option key={tp} value={tp}>
                                  {tp}
                                </option>
                              ))}
                            </select>
                            {errorTipo && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorTipo}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCorreo(idx)}
                            aria-label="Quitar correo"
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Lista dinámica de Direcciones */}
              {direcciones.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="block text-[11.5px] font-medium text-ink-soft">Direcciones</span>
                  {direcciones.map((dir, idx) => {
                    const errorDir = fieldErrors[`direccion_${idx}_direccion`]
                    const errorCiudad = fieldErrors[`direccion_${idx}_ciudad`]
                    const errorEstado = fieldErrors[`direccion_${idx}_estado`]
                    const errorTipo = fieldErrors[`direccion_${idx}_tipo`]

                    return (
                      <div
                        key={idx}
                        className="space-y-2 rounded-xl border border-line bg-surface p-3 transition-all animate-pop"
                      >
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[12px] font-semibold text-ink">Dirección #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDireccion(idx)}
                            aria-label="Quitar dirección"
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-ink-soft hover:bg-panel hover:text-ink"
                          >
                            <IconX size={13} />
                            Quitar
                          </button>
                        </div>

                        {/* Calle y segunda línea */}
                        <div>
                          <input
                            required
                            maxLength={150}
                            value={dir.direccion}
                            onChange={(e) => handleUpdateDireccion(idx, { direccion: e.target.value })}
                            placeholder="Calle y número *"
                            className={getInputClasses(Boolean(errorDir))}
                          />
                          {errorDir && (
                            <p className="mt-1 text-[11.5px] font-medium text-danger">{errorDir}</p>
                          )}
                        </div>

                        <input
                          maxLength={150}
                          value={dir.segundaLinea}
                          onChange={(e) => handleUpdateDireccion(idx, { segundaLinea: e.target.value })}
                          placeholder="Colonia / Interior / Referencia"
                          className={getInputClasses(false)}
                        />

                        {/* Últimos seis campos alineados en cuadrícula simétrica de 3 columnas */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <input
                              required
                              maxLength={100}
                              value={dir.ciudad}
                              onChange={(e) => handleUpdateDireccion(idx, { ciudad: e.target.value })}
                              placeholder="Ciudad *"
                              className={getInputClasses(Boolean(errorCiudad))}
                            />
                            {errorCiudad && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorCiudad}</p>
                            )}
                          </div>
                          <div>
                            <input
                              required
                              maxLength={100}
                              value={dir.estado}
                              onChange={(e) => handleUpdateDireccion(idx, { estado: e.target.value })}
                              placeholder="Estado / Provincia *"
                              className={getInputClasses(Boolean(errorEstado))}
                            />
                            {errorEstado && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorEstado}</p>
                            )}
                          </div>
                          <div>
                            <select
                              value={dir.tipo}
                              onChange={(e) => handleUpdateDireccion(idx, { tipo: e.target.value })}
                              className={getInputClasses(Boolean(errorTipo))}
                            >
                              {TIPOS_DIRECCION.map((tp) => (
                                <option key={tp} value={tp}>
                                  {tp}
                                </option>
                              ))}
                            </select>
                            {errorTipo && (
                              <p className="mt-1 text-[11.5px] font-medium text-danger">{errorTipo}</p>
                            )}
                          </div>
                        </div>

                        {/* C.P., Apartado Postal y País (alineados simétricamente con la fila superior) */}
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            maxLength={15}
                            value={dir.codigoPostal}
                            onChange={(e) => handleUpdateDireccion(idx, { codigoPostal: e.target.value })}
                            placeholder="C.P."
                            className={`tabular-nums ${getInputClasses(false)}`}
                          />
                          <input
                            maxLength={20}
                            value={dir.apartadoPostal}
                            onChange={(e) => handleUpdateDireccion(idx, { apartadoPostal: e.target.value })}
                            placeholder="Apartado postal"
                            className={getInputClasses(false)}
                          />
                          <input
                            maxLength={100}
                            value={dir.pais}
                            onChange={(e) => handleUpdateDireccion(idx, { pais: e.target.value })}
                            placeholder="País"
                            className={getInputClasses(false)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 3. Trabajo y Perfil */}
            <div className="space-y-2 border-t border-line pt-2.5">
              <span className="block text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                Trabajo y perfil
              </span>
              <div className="grid grid-cols-3 gap-2">
                <input
                  maxLength={100}
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  placeholder="Empresa / Organización"
                  className={getInputClasses(false)}
                />
                <input
                  maxLength={100}
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  placeholder="Departamento"
                  className={getInputClasses(false)}
                />
                <input
                  maxLength={100}
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                  placeholder="Puesto / Cargo"
                  className={getInputClasses(false)}
                />
              </div>
            </div>

            {/* 4. Fechas, Avatar, Notas y Favorito */}
            <div className="space-y-2 border-t border-line pt-2.5">
              <span className="block text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                Detalles adicionales
              </span>
              <div className="grid grid-cols-[140px_1fr] gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-ink-soft">Cumpleaños</span>
                  <input
                    type="date"
                    value={cumpleanos}
                    onChange={(e) => setCumpleanos(e.target.value)}
                    className={`${getInputClasses(false)} tabular-nums`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-ink-soft">URL de foto / avatar</span>
                  <input
                    maxLength={255}
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://ejemplo.com/foto.jpg"
                    className={getInputClasses(false)}
                  />
                </label>
              </div>

              <textarea
                rows={2}
                maxLength={500}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Notas sobre el contacto..."
                className={getTextareaClasses(false)}
              />
            </div>

            {/* 5. Etiquetas del Contacto */}
            <div className="space-y-2 border-t border-line pt-2.5">
              <span className="block text-[11px] font-medium tracking-[0.08em] text-ink-soft uppercase">
                Etiquetas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {allTagOptions.map((t) => {
                  const isSelected = selectedTagNames.some((n) => n.toLowerCase() === t.nombre.toLowerCase())
                  return (
                    <button
                      key={t.nombre}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleTagSelection(t)}
                      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] transition-colors focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none ${
                        isSelected
                          ? 'border-ink/20 bg-surface font-medium text-ink shadow-whisper'
                          : 'border-line text-ink-soft hover:text-ink'
                      }`}
                    >
                      <TagDot color={t.hexColor} size={6} />
                      <span>
                        <span className="text-ink-faint">#</span>
                        {t.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="text"
                  maxLength={49}
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomTag()
                    }
                  }}
                  placeholder="Nueva etiqueta (ej. Amigos)"
                  className="h-8 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[12.5px] text-ink outline-none placeholder:text-ink-faint focus:border-accent/50"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-[12px] font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  <IconPlus size={12} />
                  Etiqueta
                </button>
              </div>
            </div>

            {/* Acciones del formulario */}
            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={handleToggleForm}
                className="h-9 rounded-lg px-3.5 text-[13px] text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 rounded-lg bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar contacto'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Lista de contactos existentes con cursor / búsqueda */}
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
