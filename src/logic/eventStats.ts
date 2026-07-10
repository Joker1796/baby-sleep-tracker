import dayjs from 'dayjs'

// Достаточная для статистики часть события: id/childId функции не читают.
type EventLike = { type: string; startedAt: number; endedAt?: number | null }

// Сколько событий данного типа за календарный день dayTs
export function dayCount(events: EventLike[], type: string, dayTs: number): number {
  const d = dayjs(dayTs)
  return events.filter(e => e.type === type && dayjs(e.startedAt).isSame(d, 'day')).length
}

// Суммарная длительность интервальных событий типа за день, в минутах.
// Незавершённый интервал считается до now.
export function dayTotalMin(events: EventLike[], type: string, dayTs: number, now: number = Date.now()): number {
  const d = dayjs(dayTs)
  return Math.round(
    events
      .filter(e => e.type === type && dayjs(e.startedAt).isSame(d, 'day'))
      .reduce((sum, e) => sum + Math.max(0, ((e.endedAt ?? now) - e.startedAt) / 60000), 0)
  )
}
