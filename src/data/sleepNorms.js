// Нормы сна по возрастам (0–12 мес). Время — в минутах, если не указано иное.
// Диапазоны усреднены по общепринятым рекомендациям консультантов по сну
// (окна бодрствования, суммарный сон — ориентиры, а не жёсткие правила).
export const SLEEP_NORMS = [
  {
    fromM: 0, toM: 1, label: '0–1 мес',
    wakeWindow: [40, 60], naps: [4, 8],
    daySleep: [360, 540], nightSleep: [480, 600], totalSleep: [960, 1140],
    bedtime: ['20:00', '22:00'],
    note: 'Режим ещё хаотичен: новорождённый спит короткими отрезками днём и ночью. Ориентируйтесь на признаки усталости, а не на часы.'
  },
  {
    fromM: 1, toM: 2, label: '1–2 мес',
    wakeWindow: [60, 75], naps: [4, 6],
    daySleep: [360, 480], nightSleep: [540, 600], totalSleep: [900, 1080],
    bedtime: ['20:00', '22:00'],
    note: 'Начинает выделяться более длинный ночной сон. Помогайте различать день и ночь: днём свет и звуки, ночью темнота и тишина.'
  },
  {
    fromM: 2, toM: 3, label: '2–3 мес',
    wakeWindow: [75, 90], naps: [4, 5],
    daySleep: [300, 360], nightSleep: [600, 660], totalSleep: [900, 1020],
    bedtime: ['19:30', '21:30'],
    note: 'Появляются наметки режима. Хорошее время начать простой ритуал укладывания.'
  },
  {
    fromM: 3, toM: 4, label: '3–4 мес',
    wakeWindow: [90, 110], naps: [3, 4],
    daySleep: [240, 300], nightSleep: [600, 660], totalSleep: [840, 960],
    bedtime: ['19:00', '20:30'],
    note: 'Приближается регресс сна 4 месяцев — сон перестраивается на «взрослые» циклы. Возможный переход с 4 на 3 дневных сна.'
  },
  {
    fromM: 4, toM: 6, label: '4–6 мес',
    wakeWindow: [120, 150], naps: [3, 3],
    daySleep: [180, 240], nightSleep: [600, 660], totalSleep: [840, 900],
    bedtime: ['19:00', '20:00'],
    note: 'Обычно 3 дневных сна: два основных и короткий вечерний. Режим становится предсказуемее.'
  },
  {
    fromM: 6, toM: 8, label: '6–8 мес',
    wakeWindow: [150, 180], naps: [2, 3],
    daySleep: [150, 210], nightSleep: [600, 660], totalSleep: [780, 840],
    bedtime: ['19:00', '20:00'],
    note: 'Период перехода с 3 на 2 дневных сна: третий (вечерний) сон постепенно уходит.'
  },
  {
    fromM: 8, toM: 10, label: '8–10 мес',
    wakeWindow: [180, 210], naps: [2, 2],
    daySleep: [120, 180], nightSleep: [600, 660], totalSleep: [780, 840],
    bedtime: ['19:00', '20:00'],
    note: 'Два дневных сна: утренний и обеденный. Возможен регресс из-за скачка развития (ползание, вставание).'
  },
  {
    fromM: 10, toM: 13, label: '10–12 мес',
    wakeWindow: [210, 240], naps: [1, 2],
    daySleep: [120, 150], nightSleep: [600, 660], totalSleep: [750, 840],
    bedtime: ['19:00', '20:30'],
    note: 'У большинства всё ещё 2 сна, но некоторые дети начинают переходить на один дневной сон.'
  }
]

export function getNorms(ageMonths) {
  const m = Math.max(0, ageMonths)
  return SLEEP_NORMS.find(n => m >= n.fromM && m < n.toM) || SLEEP_NORMS[SLEEP_NORMS.length - 1]
}

export function avgWakeWindow(norms) {
  return Math.round((norms.wakeWindow[0] + norms.wakeWindow[1]) / 2)
}
