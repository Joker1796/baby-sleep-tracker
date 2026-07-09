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
  // Возрастные нормы нужны для разброса окон бодрствования (утро короче, вечер длиннее)
  const childNorms = child ? getNorms(ageInMonths(child.birthDate, now)) : null
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
      napDurationMin: Math.max(20, Math.round(daySleep / napCount)),
      wwRange: childNorms ? childNorms.wakeWindow : null
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
    napDurationMin: Math.max(20, Math.round(daySleep / napCount)),
    wwRange: norms.wakeWindow
  }
}

const MIN_WW = 20        // минимальное окно бодрствования, мин
const ANCHOR_PRE = 30    // за сколько до события малыш уже бодрствует
const ANCHOR_POST = 45   // сколько после начала события длится бодрствование

// Раскладывает распорядок «на завтра». wakeMin/bedMin из override (выбор
// пользователя) имеют приоритет над профилем; число снов и длительность — из профиля.
// override.anchors — запланированные события [{ min, label, icon }]: расписание
// перестраивается так, чтобы к их времени малыш бодрствовал.
export function buildSchedule(profile, override = {}) {
  const wakeMin = override.wakeMin != null ? override.wakeMin : profile.wakeMin
  let bedMin = override.bedMin != null ? override.bedMin : profile.bedMin
  const { napCount, napDurationMin } = profile

  // Отбой должен быть позже подъёма
  if (bedMin <= wakeMin) bedMin = wakeMin + 11 * 60

  const awake = Math.max(0, bedMin - wakeMin - napCount * napDurationMin)

  // Окна бодрствования растут к вечеру: утром короче, перед ночным сном длиннее.
  // Соотношение «последнее / первое» берём из возрастных норм, иначе ~1.4.
  const rawSpread = profile.wwRange && profile.wwRange[0] > 0
    ? profile.wwRange[1] / profile.wwRange[0]
    : 1.4
  const spread = Math.min(1.8, Math.max(1.15, rawSpread))

  const nWindows = napCount + 1
  const weights = []
  for (let i = 0; i < nWindows; i++) {
    weights.push(nWindows > 1 ? 1 + (spread - 1) * (i / (nWindows - 1)) : 1)
  }
  const wSum = weights.reduce((s, w) => s + w, 0)
  const windows = weights.map(w => Math.max(MIN_WW, Math.round((awake * w) / wSum)))

  // Раскладываем сны по возрастающим окнам
  let naps = []
  let t = wakeMin
  for (let i = 0; i < napCount; i++) {
    const startMin = t + windows[i]
    const endMin = startMin + napDurationMin
    naps.push({ startMin, endMin })
    t = endMin
  }

  // Учитываем запланированные события: сдвигаем сны, чтобы малыш бодрствовал
  const anchors = (override.anchors || [])
    .filter(a => a && a.min != null && a.min > wakeMin && a.min < bedMin)
    .sort((a, b) => a.min - b.min)
  if (anchors.length && naps.length) {
    naps = avoidAnchors(naps, anchors, { wakeMin, bedMin, napDurationMin })
  }

  // Окна бодрствования по факту (после возможных сдвигов)
  let prev = wakeMin
  const napsOut = naps.map(n => {
    const wwBeforeMin = n.startMin - prev
    prev = n.endMin
    return {
      startMin: n.startMin,
      endMin: n.endMin,
      startHHMM: minToHHMM(n.startMin),
      endHHMM: minToHHMM(n.endMin),
      durMin: n.endMin - n.startMin,
      wwBeforeMin: Math.round(wwBeforeMin)
    }
  })
  const wwBeforeBedMin = Math.round(bedMin - prev)

  // 24-часовая полоса: ночной хвост до подъёма, дневные сны, вечерняя ночь
  const segments = [
    { type: 'night', from: 0, to: wakeMin },
    ...napsOut.map(n => ({ type: 'day', from: n.startMin, to: n.endMin })),
    { type: 'night', from: bedMin, to: 1440 }
  ].filter(s => s.to > s.from)

  const anchorsOut = anchors.map(a => ({ ...a, hhmm: minToHHMM(a.min) }))

  return {
    source: profile.hasData ? 'history' : 'norms',
    daysCounted: profile.daysCounted,
    wakeWindowMin: Math.round(awake / nWindows), // средняя (для совместимости)
    wwBeforeBedMin,
    napDurationMin,
    wake: { min: wakeMin, hhmm: minToHHMM(wakeMin) },
    naps: napsOut,
    bedtime: { min: bedMin, hhmm: minToHHMM(bedMin) },
    anchors: anchorsOut,
    adjusted: anchorsOut.length > 0,
    segments
  }
}

// Сдвигает сны так, чтобы вокруг каждого события [min-PRE; min+POST] малыш
// бодрствовал: сначала пробуем закончить сон раньше, иначе — начать позже.
// Затем каскадом убираем наложения и отбрасываем сны, вылезшие за отбой.
function avoidAnchors(naps, anchors, { wakeMin, bedMin, napDurationMin }) {
  let res = naps.map(n => ({ ...n }))
  // Пара проходов — на случай, если сдвиг одного сна затронул соседний
  for (let pass = 0; pass < 3; pass++) {
    for (const a of anchors) {
      const lo = a.min - ANCHOR_PRE
      const hi = a.min + ANCHOR_POST
      for (let i = 0; i < res.length; i++) {
        const n = res[i]
        if (n.endMin <= lo || n.startMin >= hi) continue // не пересекается
        const prevEnd = i > 0 ? res[i - 1].endMin : wakeMin
        const earlierStart = lo - napDurationMin
        if (earlierStart - prevEnd >= MIN_WW) {
          n.startMin = earlierStart          // успеваем поспать до события
        } else {
          n.startMin = hi                    // иначе сон уходит на время после события
        }
        n.endMin = n.startMin + napDurationMin
      }
    }
    // Каскад: не допускаем наложения снов и минимальное окно между ними
    for (let i = 0; i < res.length; i++) {
      const prevEnd = i > 0 ? res[i - 1].endMin : wakeMin
      if (res[i].startMin < prevEnd + MIN_WW) {
        res[i].startMin = prevEnd + MIN_WW
        res[i].endMin = res[i].startMin + napDurationMin
      }
    }
  }
  // Сны, не влезшие до отбоя, убираем
  return res.filter(n => n.endMin <= bedMin - MIN_WW)
}
