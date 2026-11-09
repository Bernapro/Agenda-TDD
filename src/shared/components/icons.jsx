function makeIcon(paths) {
  return function Icon({ size = 16, ...props }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    )
  }
}

/**
 * Lucide-style PanelLeft cuya franja izquierda se rellena cuando el panel está abierto (opacity-100)
 * y se oculta cuando está cerrado (opacity-0).
 */
export function IconPanelLeft({ open, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5 3h4v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        fill="currentColor"
        stroke="none"
        className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}

export const IconChevronDown = makeIcon(<path d="m6 9 6 6 6-6" />)
export const IconChevronLeft = makeIcon(<path d="m15 18-6-6 6-6" />)
export const IconChevronRight = makeIcon(<path d="m9 18 6-6-6-6" />)
export const IconSearch = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
)
export const IconUsers = makeIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>,
)
export const IconPlus = makeIcon(<path d="M12 5v14M5 12h14" />)
export const IconCalendar = makeIcon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </>,
)
export const IconCheckCircle = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </>,
)
export const IconRepeat = makeIcon(
  <>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </>,
)
export const IconMapPin = makeIcon(
  <>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </>,
)
export const IconClock = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
)
export const IconCheck = makeIcon(<path d="M20 6 9 17l-5-5" />)
export const IconX = makeIcon(<path d="M18 6 6 18M6 6l12 12" />)
export const IconFlame = makeIcon(
  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
)
export const IconSun = makeIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>,
)
export const IconCornerLeft = makeIcon(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </>,
)
export const IconDownload = makeIcon(
  <>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </>,
)
export const IconFileText = makeIcon(
  <>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </>,
)
export const IconTable = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M3 15h18M9 4v16" />
  </>,
)
export const IconBell = makeIcon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </>,
)
export const IconStar = makeIcon(
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
)

export function IconHeart({ filled = false, size = 16, className = '', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  )
}

function Triangle({ dir, size = 12, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" {...props}>
      <path
        d={dir === 'left' ? 'M8 2.2 3 6l5 3.8Z' : 'M4 2.2 9 6 4 9.8Z'}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const IconTriangleLeft = (p) => <Triangle dir="left" {...p} />
export const IconTriangleRight = (p) => <Triangle dir="right" {...p} />

export const KIND_META = {
  event: {
    label: 'Evento',
    description: 'Rango de hora, ubicación e invitados',
    shortcut: 'E',
    Icon: IconCalendar,
    tile: 'bg-event/10 text-event',
    defaultHex: '#3B82F6',
  },
  task: {
    label: 'Tarea',
    description: 'Casilla de completado y hora límite',
    shortcut: 'T',
    Icon: IconCheckCircle,
    tile: 'bg-task/10 text-task',
    defaultHex: '#D97706',
  },
  routine: {
    label: 'Rutina',
    description: 'Repetición y seguimiento de hábito',
    shortcut: 'R',
    Icon: IconRepeat,
    tile: 'bg-routine/10 text-routine',
    defaultHex: '#8B5CF6',
  },
}
