import { IconUsers } from '../../../shared/components/icons'

export function ContactsButton({ count = 0, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[14px] text-ink transition-colors hover:bg-surface/70 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
    >
      <IconUsers size={16} className="text-ink-soft" />
      <span className="flex-1">Contactos</span>
      <span className="text-[12px] text-ink-faint tabular-nums">{count}</span>
    </button>
  )
}
