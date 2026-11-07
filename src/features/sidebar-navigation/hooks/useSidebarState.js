import { useCallback, useState } from 'react'

export function useSidebarState(initialOpen = true) {
  const [sidebarOpen, setSidebarOpen] = useState(initialOpen)
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), [])
  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  }
}
