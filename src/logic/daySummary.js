import { formatDurationMin, plural } from './age'
import { getNorms } from '../data/sleepNorms'
import { metNorms } from './guidance'
import { poopVerb } from './gender'

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Короткое текстовое резюме дня (2–3 предложения) по цифрам сна и событий.
export function summarizeDay({ summary, tummyMin = 0, poopCount = 0, ageM = 6, isToday = false, gender = null }) {
  const s = summary
  if (s.totalSleepMin === 0 && tummyMin === 0 && poopCount === 0) {
    return isToday
      ? 'За сегодня пока нет отметок — отмечайте сон и события, и здесь появится сводка дня.'
      : 'За этот день отметок нет.'
  }

  const norms = getNorms(ageM)
  const parts = []

  // 1. Сон
  const napW = plural(s.napCount, 'сон', 'сна', 'снов')
  parts.push(
    `${isToday ? 'Пока наспано' : 'Всего сна'} ${formatDurationMin(s.totalSleepMin)}: ночью ${formatDurationMin(s.nightSleepMin)}, днём ${formatDurationMin(s.daySleepMin)} за ${s.napCount} ${napW}.`
  )

  // 2. Оценка по норме (для завершённого дня)
  if (isToday) {
    parts.push('День ещё идёт — итог по возрастной норме будет виден к вечеру.')
  } else {
    const met = metNorms(s, norms)
    if (met.all) parts.push('Это хорошо укладывается в возрастную норму — отличный день по сну.')
    else if (s.totalSleepMin >= norms.totalSleep[0] - 60) parts.push('Почти по норме для возраста.')
    else parts.push('Для возраста сна маловато — такой недосып лучше гасить ранним ночным укладыванием.')
  }

  // 3. События дня
  const ev = []
  if (tummyMin > 0) ev.push(`на животе ${formatDurationMin(tummyMin)}`)
  if (poopCount > 0) {
    ev.push(`${poopVerb(gender).toLowerCase()} ${poopCount} ${plural(poopCount, 'раз', 'раза', 'раз')}`)
  }
  if (ev.length) parts.push(cap(ev.join(', ')) + '.')
  else parts.push(`Стула ${isToday ? 'пока ' : ''}не было.`)

  return parts.join(' ')
}
