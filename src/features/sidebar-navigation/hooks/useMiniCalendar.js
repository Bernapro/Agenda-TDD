import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMonthMatrix } from '../../agenda-board/utils/dateRangeCalculator'

export function useMiniCalendar(activeDate, onSelectDate) {
  const [view, setView] = useState(() => new Date(activeDate.getFullYear(), activeDate.getMonth(), 1))

  const activeYear = activeDate.getFullYear()
  const activeMonth = activeDate.getMonth()

  useEffect(() => {
    setView(new Date(activeYear, activeMonth, 1))
  }, [activeYear, activeMonth])

  const weeks = useMemo(() => getMonthMatrix(view.getFullYear(), view.getMonth()), [view])

  const shiftMonth = useCallback((delta) => {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1))
  }, [])

  const handleCellClick = useCallback(
    (date, inMonth) => {
      if (!inMonth) {
        setView(new Date(date.getFullYear(), date.getMonth(), 1))
      }
      onSelectDate(date)
    },
    [onSelectDate],
  )

  return {
    view,
    weeks,
    shiftMonth,
    handleCellClick,
  }
}
