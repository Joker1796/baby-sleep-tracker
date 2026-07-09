import { LayoutAnimation } from 'react-native'

// Плавная анимация следующего изменения раскладки (раскрытие карточек, секций).
// Вызывать непосредственно перед setState, который меняет высоту/состав вью.
export function animateLayout(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
}
