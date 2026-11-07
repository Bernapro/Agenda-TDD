import { useEffect, useRef } from 'react'

/**
 * Hook reutilizable para observar el elemento centinela en listas con scroll infinito por cursor.
 */
export function useIntersectionObserver({ onIntersect, enabled = true, rootRef = null, rootMargin = '120px', threshold = 0.1 }) {
  const targetRef = useRef(null)
  const callbackRef = useRef(onIntersect)

  useEffect(() => {
    callbackRef.current = onIntersect
  }, [onIntersect])

  useEffect(() => {
    const element = targetRef.current
    if (!enabled || !element) return

    const rootElement = rootRef && 'current' in rootRef ? rootRef.current : null

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          callbackRef.current?.()
        }
      },
      { root: rootElement, rootMargin, threshold },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, rootRef, rootMargin, threshold])

  return targetRef
}
