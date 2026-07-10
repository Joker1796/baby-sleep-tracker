import dayjs from 'dayjs'
import { buildAdvice } from './advisor'
import { analyzeDay, isDaytimeStart, DAY_START_H, SHORT_NAP_MIN, durationMin, lastNapToday } from './sleepAnalyzer'
import { formatDurationMin, plural } from './age'
import { avgWakeWindow } from '../data/sleepNorms'
import { activitiesForAge } from '../data/activityIdeas'
import { settlingAdviceByLocation, SETTLING_LOCATIONS } from '../data/settlingSteps'
import { NAP_EXTENSION_STEPS, NAP_EXTENSION_GIVEUP, NAP_EXTENSION_TIMEOUT_MIN } from '../data/napExtension'
import { nightAlgorithm } from '../data/nightAlgorithm'
import { stageProgressFor } from '../data/stageProgress'
import type { BuildGuidanceArgs, Child, DaySleepSummary, Greeting, Guidance, GuidancePhase, Milestone, SleepEvent, SleepNorms } from './types'

// Реэкспорт доменных типов: исторически UI импортирует их из guidance.
export type * from './types'

const MS_MIN = 60000
// После этого времени бодрствование считается ночным (пробуждение на кормление,
// а не начало активного дня).
const NIGHT_START_MIN = 19 * 60 + 45 // 19:45

// Начало текущего ночного сна («отбой») — самый ранний ночной сон за последние ~16 ч.
export function nightBedtimeStart(events: SleepEvent[], now: number = Date.now()): number | null {
  const from = now - 16 * 3600000
  const nightStarts = events
    .filter(e => e.type === 'sleep' && e.startedAt >= from && e.startedAt <= now && !isDaytimeStart(e))
    .map(e => e.startedAt)
  return nightStarts.length ? Math.min(...nightStarts) : null
}

// Если сегодня ровно исполнился новый месяц (или год) — данные для поздравления.
export function milestoneToday(child: Child | null | undefined, now: number = Date.now()): Milestone | null {
  if (!child?.birthDate) return null
  const bd = dayjs(child.birthDate)
  const today = dayjs(now)
  const months = today.diff(bd, 'month')
  if (months <= 0) return null
  // Дата, когда завершились эти месяцы, должна совпасть с сегодняшним днём
  if (!bd.add(months, 'month').isSame(today, 'day')) return null

  if (months % 12 === 0) {
    const years = months / 12
    return { months, years, isYear: true, text: `Сегодня малышу ${years} ${plural(years, 'год', 'года', 'лет')}! 🎂` }
  }
  return { months, isYear: false, text: `Сегодня малышу ${months} ${plural(months, 'месяц', 'месяца', 'месяцев')}! 🎉` }
}

// Уложился ли малыш в нормы по итогам дня
export function metNorms(
  summary: Pick<DaySleepSummary, 'daySleepMin' | 'totalSleepMin'>,
  norms: SleepNorms
): { dayOk: boolean; totalOk: boolean; all: boolean } {
  const dayOk = summary.daySleepMin >= norms.daySleep[0] - 20
  const totalOk = summary.totalSleepMin >= norms.totalSleep[0] - 30
  return { dayOk, totalOk, all: dayOk && totalOk }
}

// Главная функция для главного экрана: фаза + персональные подсказки.
// settling — сессия укладывания или null; extension — сессия продления сна или null.
export function buildGuidance({ child, events, now = Date.now(), settling = null, extension = null }: BuildGuidanceArgs): Guidance {
  const a = buildAdvice({ child, events, now })
  const { state, norms, today, nextNapAt, wakeWindowLeft, bedtimeAt, nextIsNight, ageM, windDownMin } = a
  const hour = dayjs(now).hour()

  const dayStart = dayjs(now).startOf('day').valueOf()
  const todayEvents = events.filter(e => e.startedAt >= dayStart)
  const hasBathToday = todayEvents.some(e => e.type === 'bath')

  const yesterday = analyzeDay(events, dayjs(now).subtract(1, 'day').valueOf(), now)

  // Ночь: после 19:45 или до утреннего подъёма. В это время бодрствование —
  // это ночное пробуждение (кормление), а не начало активного дня.
  const minuteOfDay = hour * 60 + dayjs(now).minute()
  const isNightNow = minuteOfDay >= NIGHT_START_MIN || hour < DAY_START_H

  // Ночное пробуждение — только если идёт ночной сон (малыш уже уходил в ночь)
  // и он проснулся до утреннего начала дня (DAY_START_H следующего утра).
  // Вечернее бодрствование до отбоя и утренний подъём сюда не относятся.
  let bedtimeStart = nightBedtimeStart(events, now)
  // Сон сразу после вечернего купания (18–22) тоже считаем ночным отбоем,
  // даже если он начался до 19:00 — тогда пробуждение из него ночное.
  const from16h = now - 16 * 3600000
  const eveningBath = events
    .filter(
      e =>
        e.type === 'bath' &&
        e.startedAt >= from16h &&
        e.startedAt <= now &&
        dayjs(e.startedAt).hour() >= 18 &&
        dayjs(e.startedAt).hour() < 22
    )
    .sort((x, y) => y.startedAt - x.startedAt)[0]
  if (eveningBath) {
    const bathEnd = eveningBath.endedAt ?? eveningBath.startedAt
    const afterBath = events
      .filter(e => e.type === 'sleep' && e.startedAt >= bathEnd && e.startedAt <= now)
      .sort((x, y) => x.startedAt - y.startedAt)[0]
    if (afterBath) {
      bedtimeStart = bedtimeStart == null ? afterBath.startedAt : Math.min(bedtimeStart, afterBath.startedAt)
    }
  }
  const morningAfterBedtime =
    bedtimeStart != null
      ? dayjs(bedtimeStart)
          .add(dayjs(bedtimeStart).hour() >= DAY_START_H ? 1 : 0, 'day')
          .startOf('day')
          .add(DAY_START_H, 'hour')
          .valueOf()
      : null
  const isNightWaking =
    !state.sleeping && bedtimeStart != null && state.lastWakeAt != null && state.lastWakeAt >= bedtimeStart && now < morningAfterBedtime!

  // Последний завершённый дневной сон и его длительность
  const lastNap = lastNapToday(events, now)
  const lastNapMin = lastNap ? durationMin(lastNap) : null
  const lastSleepMin = state.lastCompleted ? durationMin(state.lastCompleted) : null
  const justWokeRecently = state.awakeMin != null && state.awakeMin <= 20

  // Короткий дневной сон (<35 мин) → предложить продлить сон
  const shortDayNap = !state.sleeping && !isNightWaking && !isNightNow && lastNapMin != null && lastNapMin < 35 && justWokeRecently
  // Короткий ночной сон после купания (<30 мин) → тоже предложить продлить
  const shortNightAfterBath =
    !state.sleeping && isNightWaking && hasBathToday && lastSleepMin != null && lastSleepMin < 30 && justWokeRecently
  const justWokeShort = shortDayNap || shortNightAfterBath

  // ── Фаза ──
  let phase: GuidancePhase
  if (state.sleeping) phase = 'sleeping'
  else if (state.lastWakeAt == null) phase = 'no-data'
  else if (extension && extension.startedAt) phase = 'nap-extension'
  else if (settling && settling.startedAt) phase = 'settling'
  else if (isNightWaking) phase = 'night-waking'
  else if (wakeWindowLeft != null && wakeWindowLeft <= 10) phase = 'time-to-sleep'
  else if (wakeWindowLeft != null && wakeWindowLeft <= (windDownMin || 30)) phase = 'wind-down'
  else phase = 'active'

  const g: Guidance = {
    phase,
    advisor: a,
    nextNapAt,
    bedtimeAt,
    nextIsNight,
    hasBathToday,
    isNight: isNightNow,
    isNightWaking,
    wakeSince: state.lastWakeAt,
    headline: '',
    lines: [],
    activities: [],
    suggestBath: false,
    showStartSettling: false,
    wakeChecklist: [],
    steps: [],
    locationOptions: [],
    location: null,
    settlingMin: settling?.startedAt ? Math.round((now - settling.startedAt) / MS_MIN) : 0,
    showExtendNap: justWokeShort && !(extension && extension.startedAt),
    extensionMin: extension?.startedAt ? Math.round((now - extension.startedAt) / MS_MIN) : 0,
    achievement: null,
    encouragement: null,
    greeting: null,
    milestone: milestoneToday(child, now)
  }

  // Утренние дела показываем только в первое бодрствование дня (ещё не было снов).
  // Выкладывание на живот вынесено в отдельную кнопку с таймером.
  const isFirstWake = today.napCount === 0
  function wakeChecklist() {
    if (!isFirstWake) return []
    return [{ id: 'vitaminD', type: 'vitaminD', label: 'Дать витамин D', scope: 'day' }]
  }

  if (phase === 'no-data') {
    g.headline = 'Начнём отслеживать сон'
    g.lines = ['Отметьте, когда малыш засыпает и просыпается, — и я подскажу, когда укладывать в следующий раз и как выстроить режим.']
  } else if (phase === 'nap-extension') {
    g.headline = 'Продлеваем сон'
    if (g.extensionMin >= NAP_EXTENSION_TIMEOUT_MIN) {
      g.lines.push(NAP_EXTENSION_GIVEUP)
    } else {
      g.lines.push('Малыш проснулся рано. Пробуем помочь доспать по шагам:')
      g.steps = NAP_EXTENSION_STEPS
    }
  } else if (phase === 'night-waking') {
    // Подсказка зависит от времени и от того, сколько прошло после отбоя
    const hoursSinceBedtime = bedtimeStart != null ? (now - bedtimeStart) / 3600000 : null
    const algo = nightAlgorithm({ hour, hoursSinceBedtime })
    g.headline = algo.title
    g.lines.push(...algo.lines)
  } else if (phase === 'active') {
    // Время до сна и статус показаны в верхней карточке — здесь их не дублируем.
    g.headline = 'Чем заняться'
    g.activities = activitiesForAge(ageM)
    g.wakeChecklist = wakeChecklist()
    if (nextIsNight && !hasBathToday && hour >= 17) {
      g.suggestBath = true
      g.lines.push('Ближе к вечеру впишите в ритуал купание — тёплая ванна за 30–60 минут до сна помогает малышу расслабиться.')
    }
  } else if (phase === 'wind-down') {
    g.headline = 'Скоро сон'
    g.lines.push(
      `Примерно в ${dayjs(nextNapAt || bedtimeAt).format('HH:mm')} пора укладываться. Начинайте сбавлять темп: приглушите свет, спокойные тихие игры, без экранов и шумной активности.`
    )
    g.wakeChecklist = wakeChecklist()
    if (nextIsNight && !hasBathToday) {
      g.suggestBath = true
      g.lines.push('Перед ночным сном хорошо искупать малыша — это часть вечернего ритуала и сигнал «скоро спать».')
    }
    g.showStartSettling = true
  } else if (phase === 'time-to-sleep') {
    g.headline = 'Пора укладывать'
    if (wakeWindowLeft! <= 0) {
      g.lines.push(
        'Малыш бодрствует дольше нормы для своего возраста. Уложите сейчас, пока не перегулял — с переутомлением уснуть намного труднее.'
      )
    } else {
      g.lines.push('Окно бодрствования почти закончилось — самое время начинать укладывание, не дожидаясь слёз от усталости.')
    }
    if (nextIsNight && !hasBathToday) {
      g.suggestBath = true
      g.lines.push('Это ночной сон — если купаете, сделайте это сейчас, перед укладыванием.')
    }
    g.showStartSettling = true
  } else if (phase === 'settling') {
    g.headline = 'Укладываемся'
    g.locationOptions = SETTLING_LOCATIONS
    g.location = settling?.location || null
    if (!g.location) {
      g.lines.push('Где сейчас укладываете малыша? Подберу советы под обстановку.')
    } else {
      g.steps = settlingAdviceByLocation(child, g.location)
      if (g.settlingMin >= 30) {
        g.lines.push(
          `Укладывание идёт уже ${formatDurationMin(g.settlingMin)}. Если не выходит — вероятно, малыш перегулял или, наоборот, ещё не устал. Сделайте паузу 15–20 минут при тусклом свете и попробуйте заново. Вы справляетесь, это правда бывает непросто.`
        )
      }
    }
  } else if (phase === 'sleeping') {
    const night = !isDaytimeStart(state.sleeping!)
    g.headline = night ? 'Ночной сон идёт' : 'Дневной сон идёт'
    if (night) {
      g.lines.push('Пусть спит. При пробуждениях — минимум света, тихий голос, никакой стимуляции: так малыш легче свяжет циклы сна.')
    } else {
      g.lines.push(
        `Малыш спит уже ${formatDurationMin(state.sleepingMin!)}. Не будите раньше времени, но следите, чтобы поздний дневной сон не сдвинул ночной.`
      )
    }
  }

  // ── Достижение (кубок) ──
  const todayMet = metNorms(today, norms)
  if (hour >= 18 && todayMet.all) {
    g.achievement = { text: 'Отличный день! Малыш выспался и днём, и по общей суточной норме. Вы большие молодцы 👏' }
  }

  // ── Поддержка мамы, если сна мало ──
  if (!g.achievement && hour >= 15 && today.daySleepMin < norms.daySleep[0] * 0.6) {
    g.encouragement = {
      text: 'Сегодня со сном непросто — так бывает у всех, и это не ваша вина. Малыши растут скачками, и режим обязательно выровняется. Позаботьтесь и о себе: глоток воды, короткая передышка, помощь близких. Хороший вечерний сон часто исправляет трудный день.'
    }
  }

  // ── Приветствие нового дня: достижения вчера + на что обратить внимание ──
  // Показывается утром (с 5:00 до 12:00) до закрытия крестиком.
  const isMorning = hour >= 5 && hour < 12
  if (isMorning) {
    g.greeting = buildGreeting(yesterday, norms, ageM)
  }

  return g
}

// Разбор вчерашнего дня: короткие сны и перегулы
function reviewDay(summary: DaySleepSummary, norms: SleepNorms): { shortNaps: number; peregul: boolean } {
  const shortNaps = summary.naps.filter(n => n.endedAt != null && durationMin(n) < SHORT_NAP_MIN).length
  const sorted = [...summary.sessions].filter(s => s.endedAt != null).sort((a, b) => a.startedAt - b.startedAt)
  let maxGap = 0
  for (let i = 1; i < sorted.length; i++) {
    maxGap = Math.max(maxGap, (sorted[i].startedAt - sorted[i - 1].endedAt!) / MS_MIN)
  }
  const peregul = maxGap > avgWakeWindow(norms) * 1.5
  return { shortNaps, peregul }
}

function buildGreeting(yesterday: DaySleepSummary, norms: SleepNorms, ageM: number): Greeting {
  const progress = stageProgressFor(ageM)
  // Нет данных за вчера (первый день / тестовый режим) — общее приветствие
  if (yesterday.totalSleepMin === 0) {
    return {
      line: 'Доброе утро! Новый день — отмечайте сны, и завтра здесь появятся итоги вчерашнего дня.',
      achievements: [],
      attention: ['Ориентируйтесь на окна бодрствования и признаки усталости — это главный ориентир дня.'],
      progress
    }
  }

  const yMet = metNorms(yesterday, norms)
  const { shortNaps, peregul } = reviewDay(yesterday, norms)

  const line = yMet.all
    ? 'Доброе утро! Вчера был отличный день по сну.'
    : yesterday.totalSleepMin >= norms.totalSleep[0] - 60
      ? 'Доброе утро! Новый день — продолжаем в том же духе.'
      : 'Доброе утро! Вчерашний день был непростым — сегодня начинаем заново, всё получится.'

  const achievements = []
  if (yMet.all) achievements.push('Малыш выспался по суточной норме — так держать! 🏆')
  else if (yesterday.totalSleepMin >= norms.totalSleep[0] - 30) achievements.push('Малыш спал почти по норме — совсем немного до цели.')
  if (shortNaps === 0 && yesterday.napCount >= norms.naps[0]) achievements.push('Дневные сны были полноценными, без коротких.')
  if (yesterday.daySleepMin >= norms.daySleep[0]) achievements.push('Дневного сна вчера хватило по возрасту.')

  const attention = []
  if (shortNaps >= 1)
    attention.push(
      `Вчера ${shortNaps === 1 ? 'был короткий сон' : 'были короткие сны'} — сегодня следите за окнами бодрствования и укладывайте при первых признаках усталости.`
    )
  if (peregul)
    attention.push('Вчера случались перегулы (малыш подолгу не спал) — сегодня не пропускайте окно сна, чтобы не копить усталость.')
  if (yesterday.daySleepMin < norms.daySleep[0] * 0.8)
    attention.push('Дневного сна вчера было маловато — при недосыпе уводите на ночь пораньше.')
  if (yesterday.napCount > norms.naps[1]) attention.push('Дневных снов было больше обычного — последите, чтобы это не укоротило ночь.')
  if (attention.length === 0) attention.push('Ориентируйтесь на окна бодрствования и признаки усталости — это главный ориентир дня.')

  return { line, achievements, attention, progress }
}
