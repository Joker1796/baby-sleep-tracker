import * as Haptics from 'expo-haptics'

// Тактильный отклик на ключевые действия. Ошибки глотаем: на устройствах
// без вибромотора (и в симуляторе) вызовы просто не срабатывают.

// Лёгкий тап — отметка события, чекбокс.
export function hapticTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

// Значимое действие завершено — уснул/проснулся, «Уснул» в укладывании.
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
}
