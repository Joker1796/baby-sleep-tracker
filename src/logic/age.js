import dayjs from 'dayjs'

// birthDate — строка 'YYYY-MM-DD'
export function ageInMonths(birthDate, now = Date.now()) {
  return dayjs(now).diff(dayjs(birthDate), 'month')
}

export function ageInWeeks(birthDate, now = Date.now()) {
  return dayjs(now).diff(dayjs(birthDate), 'week')
}

export function ageInDays(birthDate, now = Date.now()) {
  return dayjs(now).diff(dayjs(birthDate), 'day')
}

export function plural(n, one, few, many) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function formatAge(birthDate, now = Date.now()) {
  const days = ageInDays(birthDate, now)
  if (days < 0) return 'ещё не родился'
  if (days < 14) return `${days} ${plural(days, 'день', 'дня', 'дней')}`
  const months = ageInMonths(birthDate, now)
  if (months < 1) {
    const weeks = ageInWeeks(birthDate, now)
    return `${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}`
  }
  const weeksLeft = dayjs(now).diff(dayjs(birthDate).add(months, 'month'), 'week')
  const base = `${months} мес`
  return weeksLeft > 0 ? `${base} ${weeksLeft} нед` : base
}

export function formatDurationMin(min) {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h === 0) return `${rest} мин`
  if (rest === 0) return `${h} ч`
  return `${h} ч ${rest} мин`
}
