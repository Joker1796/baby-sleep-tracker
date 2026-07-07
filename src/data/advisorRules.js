import { isDaytimeStart } from '../logic/sleepAnalyzer'

// Правила подсказок. Каждое правило: when(ctx) → boolean, text(ctx) → строка.
// priority: 3 — срочно (красное), 2 — важно (жёлтое), 1 — информация.
// tipId — ссылка на статью базы знаний (data/tips.js).
//
// Контекст (ctx): now, hour, ageM, norms, sleeping, sleepingMin, lastWakeAt,
// awakeMin, today {napCount, daySleepMin, ...}, lastNapMin, shortLastNap,
// wakeWindowMin, nextNapAt, wakeWindowLeft, bedtimeAt, nextIsNight,
// daySleepDeficit, hasToday(type), t(ts)→'HH:mm', dur(min)→'1 ч 20 мин'.

export const ADVISOR_RULES = [
  {
    id: 'log-morning',
    priority: 2,
    when: c => !c.sleeping && c.lastWakeAt == null && c.hour >= 8 && c.hour < 21,
    text: () => 'Нет отметок сна за последние сутки. Отметьте, когда малыш уснул и проснулся (большой кнопкой или вручную во вкладке «История») — тогда я смогу подсказывать время следующего сна.'
  },
  {
    id: 'window-soon',
    priority: 3,
    when: c => c.awakeMin != null && c.wakeWindowLeft != null && c.wakeWindowLeft > 0 && c.wakeWindowLeft <= 15 && !c.nextIsNight,
    tipId: 'ritual',
    text: c => `Окно бодрствования почти закончилось — укладывание примерно в ${c.t(c.nextNapAt)}. Начинайте подготовку: приглушите свет, уберите активные игры, проведите короткий привычный ритуал.`
  },
  {
    id: 'window-exceeded',
    priority: 3,
    when: c => c.awakeMin != null && c.wakeWindowLeft != null && c.wakeWindowLeft <= 0 && c.wakeWindowLeft > -30,
    text: c => `Окно бодрствования превышено на ${Math.round(-c.wakeWindowLeft)} мин — укладывайте сейчас. Следите за признаками усталости: трёт глаза, зевает, отворачивается, капризничает.`
  },
  {
    id: 'window-exceeded-hard',
    priority: 3,
    when: c => c.awakeMin != null && c.wakeWindowLeft != null && c.wakeWindowLeft <= -30,
    tipId: 'overtired',
    text: c => `Сильный перегул: ${Math.round(-c.wakeWindowLeft)} мин сверх окна бодрствования. Ребёнок может быть перевозбуждён и сопротивляться сну. Сначала успокойте (затемните комнату, возьмите на руки, ${c.usesAid('white-noise') ? 'включите белый шум' : 'пошипите монотонно «шшш»'}), затем укладывайте.`
  },
  {
    id: 'short-nap',
    priority: 2,
    when: c => c.shortLastNap && !c.sleeping && !c.nextIsNight && c.nextNapAt != null,
    tipId: 'short-naps',
    text: c => `Последний сон был коротким (${c.dur(c.lastNapMin)}) — такой сон восстанавливает хуже. Окно бодрствования сокращено: следующее укладывание примерно в ${c.t(c.nextNapAt)}.`
  },
  {
    id: 'long-nap-evening',
    priority: 2,
    when: c => c.sleeping && isDaytimeStart(c.sleeping) && c.sleepingMin > 150 && c.hour >= 16,
    text: c => `Дневной сон длится уже ${c.dur(c.sleepingMin)}, а вечер близко. Подумайте о том, чтобы мягко разбудить малыша — иначе ночное укладывание сместится на позднее время.`
  },
  {
    id: 'next-is-night',
    priority: 2,
    when: c => !c.sleeping && c.nextIsNight && c.hour >= 15,
    text: c => c.today.napCount > 0
      ? `Дневных снов на сегодня достаточно (${c.today.napCount}). Следующее укладывание — уже ночное, ориентировочно в ${c.t(c.bedtimeAt)}.`
      : `Время дневных снов на сегодня вышло. Следующее укладывание — уже ночное, ориентировочно в ${c.t(c.bedtimeAt)}.`
  },
  {
    id: 'no-poop-today',
    priority: 1,
    when: c => !c.hasToday('poop') && c.hour >= 16 && c.hour < 23,
    text: () => 'Малыш сегодня ещё не какал. У грудничков это часто вариант нормы — стул бывает и раз в несколько дней. Мягко помогут выкладывание на живот, «велосипед» ножками и тёплая ванна. Насторожить должны твёрдый вздутый живот, сильное беспокойство и отказ от еды — тогда стоит показаться педиатру.'
  },
  {
    id: 'day-sleep-deficit',
    priority: 2,
    when: c => c.daySleepDeficit && c.hour >= 16 && c.hour < 21 && !c.sleeping,
    tipId: 'early-bedtime',
    text: c => `Сегодня мало дневного сна: ${c.dur(c.today.daySleepMin)} при норме от ${c.dur(c.norms.daySleep[0])}. Компенсируйте ранним ночным укладыванием — примерно в ${c.t(c.bedtimeAt)}. Недосып лучше гасить ранней ночью, а не поздним вечерним сном.`
  },
  {
    id: 'day-sleep-excess',
    priority: 1,
    when: c => c.today.daySleepMin > c.norms.daySleep[1] * 1.25 && c.hour >= 15,
    text: c => `Дневного сна сегодня уже ${c.dur(c.today.daySleepMin)} — заметно больше нормы (до ${c.dur(c.norms.daySleep[1])}). Ночной сон может стать короче или прерывистее: ограничьте оставшиеся дневные сны.`
  },
  {
    id: 'nap-count-low',
    priority: 1,
    general: true,
    when: c => c.today.napCount > 0 && c.today.napCount < c.norms.naps[0] && c.hour >= 17 && !c.daySleepDeficit,
    tipId: 'nap-transitions',
    text: c => `Снов сегодня меньше типичного для возраста (${c.today.napCount} при норме ${c.norms.naps[0]}–${c.norms.naps[1]}). Если малыш при этом бодр и хорошо спит ночью — возможно, он перерастает один из дневных снов.`
  },
  {
    id: 'bedtime-soon',
    priority: 2,
    when: c => !c.sleeping && c.now >= c.bedtimeAt - 60 * 60000 && c.now < c.bedtimeAt && c.hour >= 17,
    tipId: 'ritual',
    text: c => `Скоро ночное укладывание — примерно в ${c.t(c.bedtimeAt)}. Переходите в спокойный режим: неяркий свет, тихие игры, ритуал перед сном в одной и той же последовательности.`
  },
  {
    id: 'bedtime-passed',
    priority: 3,
    when: c => !c.sleeping && c.hour >= 19 && c.now > c.bedtimeAt + 30 * 60000,
    tipId: 'cant-fall-asleep',
    text: c => `Время ночного укладывания (~${c.t(c.bedtimeAt)}) уже прошло. Чем позже уснёт переутомлённый ребёнок, тем беспокойнее может быть ночь. Укладывайте сейчас, максимально спокойно и без стимуляции.`
  },
  {
    id: 'bath-before-bed',
    priority: 1,
    when: c => !c.sleeping && !c.hasToday('bath') && c.now >= c.bedtimeAt - 90 * 60000 && c.now < c.bedtimeAt - 25 * 60000,
    text: () => 'Купание за 30–60 минут до ночного сна помогает многим детям расслабиться и служит понятным сигналом «скоро спать». Если купаете сегодня — сейчас подходящее время.'
  },
  {
    id: 'walk-suggest',
    priority: 1,
    when: c => c.awakeMin != null && c.wakeWindowLeft != null && c.wakeWindowLeft > 30 &&
      c.awakeMin > c.wakeWindowMin * 0.25 && !c.hasToday('walk') && c.hour >= 9 && c.hour < 17,
    text: () => 'Дневной свет и свежий воздух помогают настраивать внутренние часы малыша и улучшают ночной сон. Если есть возможность — выйдите на прогулку: многие дети отлично спят в коляске.'
  },
  {
    id: 'newborn-rhythm',
    priority: 1,
    general: true,
    when: c => c.ageM < 1,
    tipId: 'newborn-rhythm',
    text: () => 'В первый месяц режим по часам ещё не работает — это нормально. Ориентируйтесь на окна бодрствования (40–60 минут) и признаки усталости, а не на расписание. Помогайте различать день и ночь: днём свет и обычный шум, ночью — темнота и тишина.'
  },
  {
    id: 'regression-4m',
    priority: 1,
    general: true,
    when: c => c.ageM >= 3 && c.ageM < 5,
    tipId: 'regression-4m',
    text: () => 'Возраст 3–5 месяцев — время регресса сна: сон перестраивается на «взрослые» циклы, возможны частые ночные пробуждения и короткие сны. Это этап развития, а не откат. Подробнее — в советах.'
  },
  {
    id: 'regression-8m',
    priority: 1,
    general: true,
    when: c => c.ageM >= 8 && c.ageM < 10,
    tipId: 'regression-8-10m',
    text: () => 'В 8–10 месяцев сон часто портится из-за скачка развития: ползание, вставание, сепарационная тревога. Днём давайте много практики новых навыков — ночью их будет меньше хотеться отрабатывать.'
  },
  {
    id: 'transition-3-2',
    priority: 1,
    general: true,
    when: c => c.ageM >= 6 && c.ageM < 8 && c.today.napCount === 2 && c.hour >= 17,
    tipId: 'nap-transitions',
    text: () => 'Похоже, сегодня было два сна. В 6–8 месяцев дети как раз переходят с трёх снов на два — если ребёнок выдерживает окна бодрствования без сильных капризов, можно закреплять режим из двух снов.'
  },
  {
    id: 'transition-2-1',
    priority: 1,
    general: true,
    when: c => c.ageM >= 10 && c.today.napCount === 1 && c.hour >= 16,
    tipId: 'nap-transitions',
    text: () => 'Сегодня был один дневной сон. Ближе к году некоторые дети начинают переходить на один сон. Переход плавный: чередуйте дни с одним и двумя снами по состоянию ребёнка и сдвигайте единственный сон к середине дня.'
  },
  {
    id: 'night-conditions',
    priority: 1,
    when: c => !!c.sleeping && !isDaytimeStart(c.sleeping),
    tipId: 'sleep-environment',
    text: c => `Ночной сон идёт. Для крепкой ночи: ${c.usesAid('blackout') ? 'полная темнота' : 'полная темнота (блэкаут-шторы сильно помогают)'}, 18–22 °C, проветренная комната. При пробуждениях — минимум света, тихий голос, никакой стимуляции.`
  },

  // === Правила на основе профиля: кормление и «помощники сна» ===
  {
    id: 'swaddle-stop',
    profile: true,
    priority: 2,
    when: c => c.usesAid('swaddle') && c.ageM >= 2,
    tipId: 'safe-sleep',
    text: c => `Вы используете пеленание, а малышу уже ${c.ageM} мес. При первых признаках переворачивания пеленание нужно прекратить — спелёнутый ребёнок на животе в опасности. Мягкая замена — спальный мешок или пеленание с руками наружу.`
  },
  {
    id: 'pacifier-bf-newborn',
    profile: true,
    priority: 1,
    when: c => c.usesAid('pacifier') && (c.feeding === 'breast' || c.feeding === 'mixed') && c.ageM < 1,
    tipId: 'safe-sleep',
    text: () => 'Соска при грудном вскармливании: в первые 3–4 недели, пока налаживается лактация, предлагайте её умеренно и не заменяйте ею кормления. Плюс сосания на сон — снижение риска СВДС.'
  },
  {
    id: 'feeding-to-sleep-assoc',
    profile: true,
    priority: 1,
    when: c => c.usesAid('feeding-to-sleep') && c.ageM >= 4 && !c.sleeping && c.hour >= 17,
    tipId: 'sleep-associations',
    text: c => `Засыпание ${c.feeding === 'formula' ? 'с бутылочкой' : 'на груди'} — самая сильная ассоциация: при ночных пробуждениях будет нужно то же самое. Попробуйте сдвинуть кормление в начало вечернего ритуала и докладывать малыша в кроватку сонным, но не спящим.`
  },
  {
    id: 'rocking-assoc',
    profile: true,
    priority: 1,
    when: c => c.usesAid('rocking') && c.ageM >= 6 && !c.sleeping && c.hour >= 17,
    tipId: 'self-soothing',
    text: () => 'Укачивание после 6 месяцев часто оборачивается ночными «требованиями повторить». Пробуйте укачивать до расслабления, а не до полного сна, и перекладывать в кроватку сонным — так ребёнок учится досыпать сам.'
  },
  {
    id: 'co-sleeping-safety',
    profile: true,
    priority: 1,
    when: c => c.usesAid('co-sleeping') && c.ageM < 6,
    tipId: 'safe-sleep',
    text: () => 'Вы отметили совместный сон. Минимум безопасности: жёсткий матрас, никаких тяжёлых одеял и подушек рядом с малышом, никогда после алкоголя или снотворного и не на диване. Самый безопасный вариант близости — приставная кроватка.'
  },
  {
    id: 'night-light-hint',
    profile: true,
    priority: 1,
    when: c => c.usesAid('night-light') && !!c.sleeping && !isDaytimeStart(c.sleeping),
    tipId: 'sleep-environment',
    text: () => 'Про ночник: свет разрушает мелатонин, поэтому лучше тусклый и тёплый (янтарный или красный), направленный в пол — а в идеале выключать его после засыпания.'
  },
  {
    id: 'stroller-only-naps',
    profile: true,
    priority: 1,
    when: c => c.usesAid('stroller-sleep') && c.ageM >= 6 && c.hour >= 8 && c.hour < 12 && !c.sleeping,
    text: () => 'Сон в коляске удобен, но после 6 месяцев сон в движении менее глубокий. Постарайтесь, чтобы хотя бы один дневной сон (лучше обеденный) проходил дома в кроватке.'
  }
]
