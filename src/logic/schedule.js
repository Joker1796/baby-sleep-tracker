import dayjs from 'dayjs'
import { analyzeDay, morningWake, eveningBedtimeStart } from './sleepAnalyzer'
import { getNorms } from '../data/sleepNorms'
import { ageInMonths } from './age'

// 'HH:MM' ↔ минуты от полуночи
export function minToHHMM(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function hhmmToMin(hhmm) {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

// Профиль «среднего дня» по последним `days` дням с данными о сне.
// Если данных нет — профиль из возрастных норм ребёнка.
export function scheduleProfile(events, now = Date.now(), days = 7, child = null) {
  const wakeMins = []
  const bedMins = []
  const napCounts = []
  const daySleeps = []

  for (let i = 1; i <= days; i++) {
    const dayStart = dayjs(now).startOf('day').subtract(i, 'day')
    const dayEnd = dayStart.add(1, 'day')
    const a = analyzeDay(events, dayStart.valueOf(), now)
    if (a.totalSleepMin <= 0) continue
    const wake = morningWake(events, dayStart, now)
    const bed = eveningBedtimeStart(events, dayStart, dayEnd)
    wakeMins.push((wake - dayStart.valueOf()) / 60000)
    bedMins.push((bed - dayStart.valueOf()) / 60000)
    // Длительность сна считаем только по дням, где сны реально были —
    // иначе средняя занижается днями с одним лишь ночным сном.
    if (a.napCount > 0) {
      napCounts.push(a.napCount)
      daySleeps.push(a.daySleepMin)
    }
  }

  if (wakeMins.length) {
    const napCount = napCounts.length ? Math.max(1, Math.round(avg(napCounts))) : 1
    const daySleep = daySleeps.length ? Math.round(avg(daySleeps)) : napCount * 60
    return {
      hasData: true,
      daysCounted: wakeMins.length,
      wakeMin: Math.round(avg(wakeMins)),
      bedMin: Math.round(avg(bedMins)),
      napCount,
      napDurationMin: Math.max(20, Math.round(daySleep / napCount))
    }
  }

  // Fallback — возрастные нормы
  const ageM = child ? ageInMonths(child.birthDate, now) : 6
  const norms = getNorms(ageM)
  const napCount = Math.max(1, Math.round((norms.naps[0] + norms.naps[1]) / 2))
  const daySleep = Math.round((norms.daySleep[0] + norms.daySleep[1]) / 2)
  const [bh, bm] = norms.bedtime[0].split(':').map(Number)
  const [bh2, bm2] = norms.bedtime[1].split(':').map(Number)
  return {
    hasData: false,
    daysCounted: 0,
    wakeMin: 7 * 60,
    bedMin: Math.round(((bh * 60 + bm) + (bh2 * 60 + bm2)) / 2),
    napCount,
    napDurationMin: Math.max(20, Math.round(daySleep / napCount))
  }
}

// Раскладывает распорядок «на завтра». wakeMin/bedMin из override (выбор
// пользователя) имеют приоритет над профилем; число снов и длительность — из профиля.
export function buildSchedule(profile, override = {}) {
  const wakeMin = override.wakeMin != null ? override.wakeMin : profile.wakeMin
  let bedMin = override.bedMin != null ? override.bedMin : profile.bedMin
  const { napCount, napDurationMin } = profile

  // Отбой должен быть позже подъёма
  if (bedMin <= wakeMin) bedMin = wakeMin + 11 * 60

  const awake = bedMin - wakeMin - napCount * napDurationMin
  const ww = Math.max(20, napCount > 0 ? awake / (napCount + 1) : awake)

  const naps = []
  let t = wakeMin
  for (let i = 0; i < napCount; i++) {
    const startMin = Math.round(t + ww)
    const endMin = Math.round(startMin + napDurationMin)
    naps.push({
      startMin,
      endMin,
      startHHMM: minToHHMM(startMin),
      endHHMM: minToHHMM(endMin),
      durMin: napDurationMin
    })
    t = endMin
  }

  // 24-часовая полоса: ночной хвост до подъёма, дневные сны, вечерняя ночь
  const segments = [
    { type: 'night', from: 0, to: wakeMin },
    ...naps.map(n => ({ type: 'day', from: n.startMin, to: n.endMin })),
    { type: 'night', from: bedMin, to: 1440 }
  ].filter(s => s.to > s.from)

  return {
    source: profile.hasData ? 'history' : 'norms',
    daysCounted: profile.daysCounted,
    wakeWindowMin: Math.round(ww),
    napDurationMin,
    wake: { min: wakeMin, hhmm: minToHHMM(wakeMin) },
    naps,
    bedtime: { min: bedMin, hhmm: minToHHMM(bedMin) },
    segments
  }
}
