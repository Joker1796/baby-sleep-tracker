// Реестр типов событий. kind: 'interval' — с началом и концом, 'point' — момент времени.
// Чтобы добавить новый тип (например, кормление) — достаточно дописать запись здесь.
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
  walk: {
    id: 'walk',
    label: 'Прогулка',
    kind: 'interval',
    icon: '🚶',
    color: 'var(--c-walk)',
    softColor: 'var(--c-walk-soft)',
    startLabel: 'Начали прогулку',
    endLabel: 'Закончили прогулку'
  },
  bath: {
    id: 'bath',
    label: 'Купание',
    kind: 'interval',
    icon: '🛁',
    color: 'var(--c-bath)',
    softColor: 'var(--c-bath-soft)',
    startLabel: 'Начали купание',
    endLabel: 'Закончили купание'
  },
  tummy: {
    id: 'tummy',
    label: 'Выкладывание на живот',
    kind: 'interval',
    icon: '👶',
    color: 'var(--c-primary)',
    softColor: 'var(--c-primary-soft)',
    startLabel: 'Начали выкладывание',
    endLabel: 'Закончили выкладывание'
  },
  poop: {
    id: 'poop',
    label: 'Покакал',
    kind: 'point',
    icon: '💩',
    color: 'var(--c-walk)',
    softColor: 'var(--c-walk-soft)'
  },
  medicine: {
    id: 'medicine',
    label: 'Лекарство',
    kind: 'point',
    icon: '💊',
    color: 'var(--c-medicine)',
    softColor: 'var(--c-medicine-soft)',
    hasNote: true,
    notePlaceholder: 'Название и доза'
  },
  wash: {
    id: 'wash',
    label: 'Умывание',
    kind: 'point',
    icon: '🧼',
    color: 'var(--c-bath)',
    softColor: 'var(--c-bath-soft)'
  },
  vitaminD: {
    id: 'vitaminD',
    label: 'Витамин D',
    kind: 'point',
    icon: '☀️',
    color: 'var(--c-warn)',
    softColor: 'var(--c-warn-soft)'
  }
}

export const EVENT_TYPE_LIST = Object.values(EVENT_TYPES)
