import dayjs from 'dayjs'

// Сколько событий данного типа за календарный день dayTs
export function dayCount(events, type, dayTs) {
  const d = dayjs(dayTs)
  return events.filter(e => e.type === type && dayjs(e.startedAt).isSame(d, 'day')).length
}

// Суммарная длительность интервальных событий типа за день, в минутах.
// Незавершённый интервал считается до now.
export function dayTotalMin(events, type, dayTs, now = Date.now()) {
  const d = dayjs(dayTs)
  return Math.round(
    events
      .filter(e => e.type === type && dayjs(e.startedAt).isSame(d, 'day'))
      .reduce((sum, e) => sum + Math.max(0, ((e.endedAt ?? now) - e.startedAt) / 60000), 0)
  )
}
