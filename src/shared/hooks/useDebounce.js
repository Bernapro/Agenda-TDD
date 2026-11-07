import { useEffect, useState } from 'react'

/**
 * Hook de debounce estricto con setTimeout y clearTimeout.
 * Por defecto usa 300ms como exige la especificación.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
