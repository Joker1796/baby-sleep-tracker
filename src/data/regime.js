// Настраиваемый режим: родитель задаёт параметры сна вручную, они переопределяют
// возрастные нормы (SLEEP_NORMS). Хранится на записи ребёнка: child.regime.
import { getNorms, avgWakeWindow } from './sleepNorms'

export const DEFAULT_REGIME_MODE = 'auto'

// Середина диапазона 'HH:MM'..'HH:MM'
function midTime(from, to) {
  const toMin = (s) => {
    const [h, m] = s.split(':').map(Number)
    return h * 60 + m
  }
  const mid = Math.round((toMin(from) + toMin(to)) / 2)
  const h = String(Math.floor(mid / 60)).padStart(2, '0')
  const m = String(mid % 60).padStart(2, '0')
  return `${h}:${m}`
}

function avg(range) {
  return Math.round((range[0] + range[1]) / 2)
}

// Начальные значения настраиваемого режима из текущих возрастных норм —
// чтобы при первом включении цифры были осмысленными.
export function seedRegimeFromNorms(ageM) {
  const norms = getNorms(ageM)
  const napCount = Math.max(1, avg(norms.naps))
  const daySleep = avg(norms.daySleep)
  return {
    mode: 'custom',
    wakeWindow: avgWakeWindow(norms),
    napCount,
    napDurationMin: Math.round(daySleep / napCount),
    dayStart: '09:00',
    nightStart: midTime(norms.bedtime[0], norms.bedtime[1]),
    morningWake: '07:00',
    nightSleepMin: avg(norms.nightSleep),
    windDownMin: 30,
    shortNapReduce: true
  }
}

// Собирает объект в форме элемента SLEEP_NORMS из пользовательских значений,
// чтобы движок (advisor) и правила работали без изменений.
export function regimeToNorms(regime) {
  const w = Math.max(15, Number(regime.wakeWindow) || 90)
  const n = Math.max(1, Number(regime.napCount) || 1)
  const dur = Math.max(10, Number(regime.napDurationMin) || 60)
  const ns = Math.max(0, Number(regime.nightSleepMin) || 600)
  const daySleep = n * dur
  const bedtime = regime.nightStart || '20:00'
  return {
    fromM: 0, toM: 999, label: 'Свой режим',
    wakeWindow: [w, w],
    naps: [n, n],
    daySleep: [daySleep, daySleep],
    nightSleep: [ns, ns],
    totalSleep: [daySleep + ns, daySleep + ns],
    bedtime: [bedtime, bedtime],
    note: ''
  }
}
