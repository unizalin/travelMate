const localDate = (instant: Date, timeZone: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(instant)

export function tripOpeningDate(dates: readonly string[], instant = new Date()): string {
  const ordered = [...dates].sort()
  if (!ordered.length) return ''

  const londonDate = localDate(instant, 'Europe/London')
  const today = londonDate <= '2026-10-29'
    ? londonDate
    : localDate(instant, 'Atlantic/Reykjavik')

  return ordered.find(date => date >= today) ?? ordered[ordered.length - 1]
}
