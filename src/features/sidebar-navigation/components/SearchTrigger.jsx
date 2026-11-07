import { IconSearch } from '../../../shared/components/icons'
import { Kbd } from '../../../shared/components/Kbd'

export function SearchTrigger({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-surface/70 px-3 text-left text-[14px] text-ink-soft transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
    >
      <IconSearch size={16} />
      <span className="flex-1">Buscador</span>
      <Kbd>⌘K</Kbd>
    </button>
  )
}
