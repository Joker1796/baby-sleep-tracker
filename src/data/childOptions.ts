// Параметры профиля ребёнка: тип кормления и «помощники сна».
// Используются в форме ребёнка и учитываются движком подсказок (advisorRules).

export interface ProfileOption {
  id: string
  label: string
  icon: string
}

export interface FeedingOption extends ProfileOption {
  short: string
}

export const GENDERS: ProfileOption[] = [
  { id: 'male', label: 'Мальчик', icon: '👦' },
  { id: 'female', label: 'Девочка', icon: '👧' }
]

export const FEEDING_TYPES: FeedingOption[] = [
  { id: 'breast', label: 'Грудное', short: 'ГВ', icon: '🤱' },
  { id: 'formula', label: 'Смесь', short: 'ИВ', icon: '🍼' },
  { id: 'mixed', label: 'Смешанное', short: 'СВ', icon: '🤱+🍼' },
  { id: 'food', label: 'Еда', short: 'Прикорм', icon: '🥣' }
]

export const SLEEP_AIDS: ProfileOption[] = [
  { id: 'white-noise', label: 'Белый шум', icon: '🌊' },
  { id: 'pacifier', label: 'Соска', icon: '🍭' },
  { id: 'swaddle', label: 'Пеленание', icon: '🧣' },
  { id: 'sleep-bag', label: 'Спальный мешок', icon: '🛌' },
  { id: 'rocking', label: 'Укачивание', icon: '🤲' },
  { id: 'feeding-to-sleep', label: 'Засыпание на груди/бутылочке', icon: '🍼' },
  { id: 'co-sleeping', label: 'Совместный сон', icon: '👨‍👩‍👧' },
  { id: 'blackout', label: 'Блэкаут-шторы', icon: '🌑' },
  { id: 'night-light', label: 'Ночник', icon: '💡' },
  { id: 'stroller-sleep', label: 'Сон в коляске', icon: '🚼' }
]

export function getFeeding(id: string | null | undefined): FeedingOption | null {
  return FEEDING_TYPES.find(f => f.id === id) || null
}

export function getAid(id: string | null | undefined): ProfileOption | null {
  return SLEEP_AIDS.find(a => a.id === id) || null
}
