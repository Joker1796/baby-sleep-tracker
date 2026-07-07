// Склонение глаголов по полу ребёнка из профиля.
// Если пол не выбран — форма с обоими окончаниями.
export function sleepVerb(gender) {
  return gender === 'female' ? 'Уснула' : gender === 'male' ? 'Уснул' : 'Уснул(а)'
}

export function wakeVerb(gender) {
  return gender === 'female' ? 'Проснулась' : gender === 'male' ? 'Проснулся' : 'Проснулся(ась)'
}

export function poopVerb(gender) {
  return gender === 'female' ? 'Покакала' : gender === 'male' ? 'Покакал' : 'Покакал(а)'
}
