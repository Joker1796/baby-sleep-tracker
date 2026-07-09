// Реестр типов событий. kind: 'interval' — с началом и концом, 'point' — момент времени.
// Порядок записей сгруппирован «по схожести» (кормление → активность → гигиена →
// здоровье) и задаёт порядок в пикере кнопок и в строках «Истории».
// btnLabel — компактная подпись для кнопки; activeLabel — подпись идущего интервала.
// amountUnit/amountAgg — числовое значение события (мл, °C) и способ агрегации в статистике.
export const EVENT_TYPES = {
  sleep: {
    id: 'sleep',
    label: 'Сон',
    kind: 'interval',
    icon: '😴',
    color: 'var(--c-sleep)',
    softColor: 'var(--c-sleep-soft)',
    startLabel: 'Уснул(а)',
    endLabel: 'Проснулся(ась)'
  },

  // ── Кормление ──
  feedLeft: {
    id: 'feedLeft',
    label: 'Левая грудь',
    btnLabel: 'Левая',
    activeLabel: 'Левая',
    kind: 'point',
    canTime: true,
    icon: '🤱',
    color: 'var(--c-medicine)',
    softColor: 'var(--c-medicine-soft)'
  },
  feedRight: {
    id: 'feedRight',
    label: 'Правая грудь',
    btnLabel: 'Правая',
    activeLabel: 'Правая',
    kind: 'point',
    canTime: true,
    icon: '🤱',
    color: 'var(--c-medicine)',
    softColor: 'var(--c-medicine-soft)'
  },
  feedFormula: {
    id: 'feedFormula',
    label: 'Смесь',
    btnLabel: 'Смесь',
    kind: 'point',
    icon: '🍼',
    color: 'var(--c-bath)',
    softColor: 'var(--c-bath-soft)',
    amountUnit: 'мл',
    amountAgg: 'sum'
  },
  food: {
    id: 'food',
    label: 'Еда',
    btnLabel: 'Еда',
    kind: 'point',
    icon: '🥣',
    color: 'var(--c-warn)',
    softColor: 'var(--c-warn-soft)',
    hasNote: true,
    notePlaceholder: 'Что ел(а)',
    minAgeM: 4 // прикорм — с 4 месяцев
  },

  // ── Активность ──
  walk: {
    id: 'walk',
    label: 'Прогулка',
    btnLabel: 'Прогулка',
    activeLabel: 'Гуляем',
    kind: 'interval',
    icon: '🚶',
    color: 'var(--c-walk)',
    softColor: 'var(--c-walk-soft)',
    startLabel: 'Начали прогулку',
    endLabel: 'Закончили прогулку'
  },
  strollerSleep: {
    id: 'strollerSleep',
    label: 'Сон в коляске',
    btnLabel: 'Сон в коляске',
    activeLabel: 'Спит в коляске',
    kind: 'interval',
    icon: '🚼',
    color: 'var(--c-sleep)',
    softColor: 'var(--c-sleep-soft)',
    startLabel: 'Уснул(а) в коляске',
    endLabel: 'Проснулся(ась)'
  },
  tummy: {
    id: 'tummy',
    label: 'Выкладывание на живот',
    btnLabel: 'Выкладывание',
    activeLabel: 'Живот',
    kind: 'interval',
    icon: '👶',
    color: 'var(--c-primary)',
    softColor: 'var(--c-primary-soft)',
    startLabel: 'Начали выкладывание',
    endLabel: 'Закончили выкладывание'
  },
  massage: {
    id: 'massage',
    label: 'Массаж',
    btnLabel: 'Массаж',
    activeLabel: 'Массаж',
    kind: 'interval',
    icon: '💆',
    color: 'var(--c-primary)',
    softColor: 'var(--c-primary-soft)',
    startLabel: 'Начали массаж',
    endLabel: 'Закончили массаж'
  },
  games: {
    id: 'games',
    label: 'Игры',
    btnLabel: 'Игры',
    activeLabel: 'Играем',
    kind: 'interval',
    icon: '🧸',
    color: 'var(--c-walk)',
    softColor: 'var(--c-walk-soft)',
    startLabel: 'Начали игры',
    endLabel: 'Закончили игры'
  },

  // ── Гигиена ──
  bath: {
    id: 'bath',
    label: 'Купание',
    btnLabel: 'Купание',
    activeLabel: 'Купаемся',
    kind: 'interval',
    icon: '🛁',
    color: 'var(--c-bath)',
    softColor: 'var(--c-bath-soft)',
    startLabel: 'Начали купание',
    endLabel: 'Закончили купание'
  },
  diaper: {
    id: 'diaper',
    label: 'Смена памперса',
    btnLabel: 'Памперс',
    kind: 'point',
    icon: '🧷',
    color: 'var(--c-warn)',
    softColor: 'var(--c-warn-soft)'
  },
  nails: {
    id: 'nails',
    label: 'Стрижка ногтей',
    btnLabel: 'Ногти',
    kind: 'point',
    icon: '✂️',
    color: 'var(--c-primary)',
    softColor: 'var(--c-primary-soft)'
  },

  // ── Здоровье ──
  poop: {
    id: 'poop',
    label: 'Покакал',
    btnLabel: 'Покакал',
    kind: 'point',
    icon: '💩',
    color: 'var(--c-walk)',
    softColor: 'var(--c-walk-soft)'
  },
  teeth: {
    id: 'teeth',
    label: 'Зубы',
    btnLabel: 'Зубы',
    kind: 'point',
    icon: '🦷',
    color: 'var(--c-info)',
    softColor: 'var(--c-info-soft)',
    hasNote: true,
    notePlaceholder: 'Заметка'
  },
  temperature: {
    id: 'temperature',
    label: 'Температура',
    btnLabel: 'Температура',
    kind: 'point',
    icon: '🌡️',
    color: 'var(--c-urgent)',
    softColor: 'var(--c-urgent-soft)',
    amountUnit: '°C',
    amountAgg: 'last'
  },
  medicine: {
    id: 'medicine',
    label: 'Лекарство',
    btnLabel: 'Лекарство',
    kind: 'point',
    icon: '💊',
    color: 'var(--c-medicine)',
    softColor: 'var(--c-medicine-soft)',
    hasNote: true,
    notePlaceholder: 'Название и доза'
  },
  vitaminD: {
    id: 'vitaminD',
    label: 'Витамин D',
    btnLabel: 'Витамин D',
    kind: 'point',
    icon: '☀️',
    color: 'var(--c-warn)',
    softColor: 'var(--c-warn-soft)'
  },
  doctor: {
    id: 'doctor',
    label: 'Приём врача',
    btnLabel: 'Врач',
    kind: 'point',
    icon: '🩺',
    color: 'var(--c-medicine)',
    softColor: 'var(--c-medicine-soft)',
    hasNote: true,
    notePlaceholder: 'Врач, причина, назначения'
  },
  vaccination: {
    id: 'vaccination',
    label: 'Прививка',
    btnLabel: 'Прививка',
    kind: 'point',
    icon: '💉',
    color: 'var(--c-urgent)',
    softColor: 'var(--c-urgent-soft)',
    hasNote: true,
    notePlaceholder: 'Какая прививка'
  },

  // ── Измерения и занятия ──
  height: {
    id: 'height',
    label: 'Рост',
    btnLabel: 'Рост',
    kind: 'point',
    icon: '📏',
    color: 'var(--c-info)',
    softColor: 'var(--c-info-soft)',
    amountUnit: 'см',
    amountAgg: 'last',
    hasNote: true,
    notePlaceholder: 'Комментарий'
  },
  weight: {
    id: 'weight',
    label: 'Вес',
    btnLabel: 'Вес',
    kind: 'point',
    icon: '⚖️',
    color: 'var(--c-info)',
    softColor: 'var(--c-info-soft)',
    amountUnit: 'кг',
    amountAgg: 'last',
    hasNote: true,
    notePlaceholder: 'Комментарий'
  },
  pool: {
    id: 'pool',
    label: 'Бассейн',
    btnLabel: 'Бассейн',
    kind: 'point',
    icon: '🏊',
    color: 'var(--c-bath)',
    softColor: 'var(--c-bath-soft)',
    hasNote: true,
    notePlaceholder: 'Комментарий'
  },
  club: {
    id: 'club',
    label: 'Кружок',
    btnLabel: 'Кружок',
    kind: 'point',
    icon: '🎨',
    color: 'var(--c-walk)',
    softColor: 'var(--c-walk-soft)',
    hasNote: true,
    notePlaceholder: 'Какой кружок'
  }
}

export const EVENT_TYPE_LIST = Object.values(EVENT_TYPES)

// Типы кормления — на главном экране всегда идут первыми
export const FEEDING_TYPE_IDS = ['feedLeft', 'feedRight', 'feedFormula', 'food']

// Календарные события: отмечаются датой и подсвечиваются во вкладке «Календарь»
// (на главный экран не выносятся)
export const CALENDAR_TYPE_IDS = ['vaccination', 'doctor', 'vitaminD', 'nails', 'medicine', 'height', 'weight', 'pool', 'club', 'teeth']
export const CALENDAR_TYPE_LIST = CALENDAR_TYPE_IDS.map(id => EVENT_TYPES[id])

// Типы, доступные в пикере «Кнопки на главном экране» (без сна и без календарных)
export const MAIN_BUTTON_TYPE_LIST = EVENT_TYPE_LIST.filter(t => t.id !== 'sleep' && !CALENDAR_TYPE_IDS.includes(t.id))

// Все события, кроме сна — для строк плашки «Истории» (в порядке реестра)
export const NON_SLEEP_TYPE_LIST = EVENT_TYPE_LIST.filter(t => t.id !== 'sleep')

// Типы для добавления события в «Истории» — без календарных
// (врач/прививки/витамин D/ногти/лекарство добавляются только в «Календаре»)
export const NON_CALENDAR_TYPE_LIST = EVENT_TYPE_LIST.filter(t => !CALENDAR_TYPE_IDS.includes(t.id))

// Набор кнопок по умолчанию
export const DEFAULT_MAIN_BUTTONS = [
  { type: 'tummy', mode: 'time' },
  { type: 'bath', mode: 'time' },
  { type: 'poop', mode: 'count' }
]

export function getMainButtons(child) {
  return Array.isArray(child?.mainButtons) ? child.mainButtons : DEFAULT_MAIN_BUTTONS
}

// Описание типа по id с безопасным fallback для неизвестных типов
// (например, из импортированной резервной копии другой версии).
export function typeDef(id) {
  return EVENT_TYPES[id] || { id, label: id, icon: '❓', kind: 'point' }
}

// «Эффективный вид» события: сохранённый на записи kind, иначе — из реестра типов
export function eventKind(e) {
  return e?.kind ?? EVENT_TYPES[e?.type]?.kind ?? 'point'
}

// Отфильтровать типы по возрасту ребёнка (мес): скрыть те, у кого minAgeM больше.
export function typesForAge(list, ageM) {
  if (ageM == null) return list
  return list.filter(t => t.minAgeM == null || ageM >= t.minAgeM)
}
