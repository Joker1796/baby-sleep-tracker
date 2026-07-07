import dayjs from 'dayjs'
import { ageInMonths, formatDurationMin } from './age'
import { getNorms, avgWakeWindow } from '../data/sleepNorms'
import { regimeToNorms } from '../data/regime'
import { currentState, analyzeDay, lastNapToday, durationMin, SHORT_NAP_MIN } from './sleepAnalyzer'
import { ADVISOR_RULES } from '../data/advisorRules'

function timeOn(now, hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return dayjs(now).startOf('day').add(h, 'hour').add(m, 'minute').valueOf()
}

// Главная функция движка: собирает контекст, считает прогнозы и прогоняет правила
export function buildAdvice({ child, events, now = Date.now() }) {
  const ageM = ageInMonths(child.birthDate, now)
  // Настраиваемый режим переопределяет возрастные нормы значениями родителя
  const custom = child.regime?.mode === 'custom' ? child.regime : null
  const norms = custom ? regimeToNorms(custom) : getNorms(ageM)
  const windDownMin = custom && custom.windDownMin != null ? Number(custom.windDownMin) : 30
  const state = currentState(events, now)
  const today = analyzeDay(events, now, now)
  const lastNap = lastNapToday(events, now)
  const lastNapMin = lastNap ? durationMin(lastNap) : null
  const shortLastNap = lastNapMin != null && lastNapMin < SHORT_NAP_MIN

  // Окно бодрствования: после короткого сна сокращаем — ребёнок восстановился хуже.
  // В настраиваемом режиме сокращение можно отключить (shortNapReduce === false).
  const allowShortNapReduce = !custom || custom.shortNapReduce !== false
  let wakeWindowMin = avgWakeWindow(norms)
  if (shortLastNap && allowShortNapReduce) {
    wakeWindowMin = Math.max(Math.round(norms.wakeWindow[0] * 0.75), norms.wakeWindow[0] - 20)
  }

  const nextNapAt = !state.sleeping && state.lastWakeAt != null
    ? state.lastWakeAt + wakeWindowMin * 60000
    : null
  const wakeWindowLeft = nextNapAt != null ? (nextNapAt - now) / 60000 : null
  const wakeProgress = state.awakeMin != null ? state.awakeMin / wakeWindowMin : null

  // Ночное укладывание: середина типичного диапазона, раньше при дефиците дневного сна
  const bedFrom = timeOn(now, norms.bedtime[0])
  const bedTo = timeOn(now, norms.bedtime[1])
  let bedtimeAt = Math.round((bedFrom + bedTo) / 2)
  const daySleepDeficit = today.daySleepMin < norms.daySleep[0] * 0.75
  if (daySleepDeficit && dayjs(now).hour() >= 14) {
    bedtimeAt = Math.max(bedFrom - 35 * 60000, timeOn(now, '18:00'))
  }

  const nextIsNight = nextNapAt != null &&
    (nextNapAt >= bedtimeAt - 45 * 60000 || today.napCount >= norms.naps[1])

  const dayStart = dayjs(now).startOf('day').valueOf()
  const todayEvents = events.filter(e => e.startedAt >= dayStart)

  const feeding = child.feeding || null
  const aids = child.aids || []

  const ctx = {
    feeding,
    aids,
    usesAid: id => aids.includes(id),
    now,
    hour: dayjs(now).hour(),
    child,
    ageM,
    norms,
    ...state,
    today,
    todayEvents,
    lastNap,
    lastNapMin,
    shortLastNap,
    wakeWindowMin,
    nextNapAt,
    wakeWindowLeft,
    bedtimeAt,
    nextIsNight,
    daySleepDeficit,
    hasToday: type => todayEvents.some(e => e.type === type),
    t: ts => dayjs(ts).format('HH:mm'),
    dur: formatDurationMin
  }

  const advices = []
  for (const rule of ADVISOR_RULES) {
    try {
      if (rule.when(ctx)) {
        advices.push({ id: rule.id, priority: rule.priority, text: rule.text(ctx), tipId: rule.tipId || null, general: rule.general || false, profile: rule.profile || false })
      }
    } catch {
      // правило с ошибкой не должно ломать приложение
    }
  }
  advices.sort((a, b) => b.priority - a.priority)

  return {
    ageM,
    norms,
    state,
    today,
    wakeWindowMin,
    windDownMin,
    wakeProgress,
    nextNapAt,
    wakeWindowLeft,
    bedtimeAt,
    nextIsNight,
    advices
  }
}
