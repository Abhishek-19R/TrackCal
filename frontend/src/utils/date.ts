export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0]
}

export const formatDateDisplay = (dateStr: string): string => {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const formatRelativeDateDisplay = (dateStr: string): string => {
  const today = getTodayDateString()
  if (dateStr === today) {
    return 'Today'
  }
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const [tYear, tMonth, tDay] = today.split('-').map(Number)
    const tDate = new Date(tYear, tMonth - 1, tDay)
    const diffDays = Math.round((date.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === -1) return 'Yesterday'
    if (diffDays === 1) return 'Tomorrow'
    return formatDateDisplay(dateStr)
  } catch {
    return formatDateDisplay(dateStr)
  }
}

