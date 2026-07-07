import dayjs from 'dayjs'

// Границы «дня» для разделения дневного и ночного сна
export const DAY_START_H = 7
export const NIGHT_START_H = 19
// Сон короче этого порога считается коротким (неполный цикл)
export const SHORT_NAP_MIN = 40

export function sleepSessions(events) {
  return events.filter(e => e.type === 'sleep').sort((a, b) => a.startedAt - b.startedAt)
}

export function durationMin(session, now = Date.now()) {
  const end = session.endedAt ?? now
  return Math.max(0, (end - session.startedAt) / 60000)
}

// Пересечение сессии с интервалом [from, to), в минутах
function overlapMin(session, from, to, now) {
  const start = Math.max(session.startedAt, from)
  const end = Math.min(session.endedAt ?? now, to)
  return Math.max(0, (end - start) / 60000)
}

// Сон, начавшийся в дневное окно этой даты, считается дневным (nap).
// Грубая эвристика по часу начала — используется там, где нет полного контекста дня
// (текущий идущий сон, поиск начала ночного отбоя).
export function isDaytimeStart(session) {
  const h = dayjs(session.startedAt).hour()
  return h >= DAY_START_H && h < NIGHT_START_H
}

// Утреннее пробуждение: конец ночного/утреннего сна, завершившегося этим утром.
// Это нижняя граница дневного окна — дневной сон считаем от подъёма после ночи.
export function morningWake(events, dayStart, now = Date.now()) {
  const dayStartTs = dayStart.valueOf()
  const dayWindowFrom = dayStart.add(DAY_START_H, 'hour').valueOf()
  const noon = dayStart.add(12, 'hour').valueOf()
  // Ночная/ранняя сессия, начавшаяся до утра и закончившаяся до полудня
  const enders = sleepSessions(events)
    .filter(s => s.endedAt != null && s.startedAt < dayWindowFrom &&
      s.endedAt > dayStartTs && s.endedAt <= noon)
    .map(s => s.endedAt)
  return enders.length ? Math.max(...enders) : dayWindowFrom
}

// Начало вечернего отбоя: верхняя граница дневного окна.
// 1) сон после купания (если купание в 19:00–22:00);
// 2) иначе последний сон, начатый с 19:00 (последний вечерний сон = ночной);
// 3) иначе 21:00.
export function eveningBedtimeStart(events, dayStart, dayEnd) {
  const dayEndTs = dayEnd.valueOf()
  const bathFrom = dayStart.add(19, 'hour').valueOf()
  const bathTo = dayStart.add(22, 'hour').valueOf()
  const sessions = sleepSessions(events)

  const bath = events
    .filter(e => e.type === 'bath' && e.startedAt >= bathFrom && e.startedAt < bathTo)
    .sort((a, b) => a.startedAt - b.startedAt)[0]
  if (bath) {
    const bathEnd = bath.endedAt ?? bath.startedAt
    const afterBath = sessions.find(s => s.startedAt >= bathEnd && s.startedAt < dayEndTs)
    if (afterBath) return afterBath.startedAt
  }

  const nightStart = dayStart.add(NIGHT_START_H, 'hour').valueOf()
  const eveningSleeps = sessions.filter(s => s.startedAt >= nightStart && s.startedAt < dayEndTs)
  if (eveningSleeps.length) return eveningSleeps[eveningSleeps.length - 1].startedAt

  return dayStart.add(21, 'hour').valueOf()
}

// Статистика за календарный день, к которому относится dateTs
export function analyzeDay(events, dateTs, now = Date.now()) {
  const dayStart = dayjs(dateTs).startOf('day')
  const dayEnd = dayStart.add(1, 'day')

  const sessions = sleepSessions(events).filter(s =>
    overlapMin(s, dayStart.valueOf(), dayEnd.valueOf(), now) > 0
  )

  // Динамические границы дневного окна
  const dayFrom = morningWake(events, dayStart, now)
  const dayTo = eveningBedtimeStart(events, dayStart, dayEnd)

  // Дневной сон (nap) — сессия, начавшаяся в окне [пробуждение, отбой) этого дня
  const naps = sessions.filter(s =>
    s.startedAt >= dayFrom && s.startedAt < dayTo && s.startedAt < dayEnd.valueOf()
  )

  const daySleepMin = naps.reduce((sum, s) => sum + durationMin(s, now), 0)
  const totalSleepMin = sessions.reduce(
    (sum, s) => sum + overlapMin(s, dayStart.valueOf(), dayEnd.valueOf(), now), 0
  )
  const nightSleepMin = Math.max(0, totalSleepMin - daySleepMin)

  return {
    sessions,
    naps,
    napCount: naps.length,
    daySleepMin: Math.round(daySleepMin),
    nightSleepMin: Math.round(nightSleepMin),
    totalSleepMin: Math.round(totalSleepMin)
  }
}

// Текущее состояние: спит / бодрствует и с какого момента
export function currentState(events, now = Date.now()) {
  const sessions = sleepSessions(events)
  const sleeping = [...sessions].reverse().find(s => s.endedAt == null && s.startedAt <= now) || null
  const completed = sessions.filter(s => s.endedAt != null && s.endedAt <= now)
  const lastCompleted = completed.length ? completed.reduce((a, b) => (a.endedAt > b.endedAt ? a : b)) : null

  let lastWakeAt = lastCompleted?.endedAt ?? null
  // Если последнее пробуждение было слишком давно, данные устарели — не строим прогноз
  if (lastWakeAt != null && now - lastWakeAt > 18 * 3600 * 1000) lastWakeAt = null

  return {
    sleeping,
    lastCompleted,
    lastWakeAt,
    awakeMin: !sleeping && lastWakeAt != null ? (now - lastWakeAt) / 60000 : null,
    sleepingMin: sleeping ? durationMin(sleeping, now) : null
  }
}

// Последний завершённый дневной сон сегодня
export function lastNapToday(events, now = Date.now()) {
  const today = dayjs(now).startOf('day')
  return sleepSessions(events)
    .filter(s => s.endedAt != null && isDaytimeStart(s) && dayjs(s.startedAt).isSame(today, 'day'))
    .pop() || null
}
