// Склонение глаголов по полу ребёнка из профиля.
// Если пол не выбран — форма с обоими окончаниями.
export function sleepVerb(gender: string | null | undefined): string {
  return gender === 'female' ? 'Уснула' : gender === 'male' ? 'Уснул' : 'Уснул(а)'
}

export function wakeVerb(gender: string | null | undefined): string {
  return gender === 'female' ? 'Проснулась' : gender === 'male' ? 'Проснулся' : 'Проснулся(ась)'
}

export function poopVerb(gender: string | null | undefined): string {
  return gender === 'female' ? 'Покакала' : gender === 'male' ? 'Покакал' : 'Покакал(а)'
}
