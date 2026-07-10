// Цвета типов событий заданы в data/eventTypes.js как CSS-переменные
// ('var(--c-medicine)', 'var(--c-medicine-soft)'). В RN нет CSS-переменных,
// поэтому резолвим их в поля палитры темы (theme/colors.ts) по имени.
import { ThemeColors } from './colors'
import { EVENT_TYPES } from '../data/eventTypes'
import type { EventTypeDef } from '../logic/types'

// 'var(--c-medicine-soft)' → 'medicineSoft'
function varToKey(v?: string): string | null {
  if (!v) return null
  const m = /var\(--c-(.+?)\)/.exec(v)
  if (!m) return null
  return m[1].replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

// Возвращает основной и мягкий цвет типа события из текущей палитры темы.
export function eventColors(colors: ThemeColors, typeId: string): { color: string; soft: string } {
  // Для неизвестных типов из старых бэкапов записи в реестре может не быть
  const def: EventTypeDef | undefined = EVENT_TYPES[typeId]
  const ck = varToKey(def?.color)
  const sk = varToKey(def?.softColor)
  return {
    color: (ck && (colors as any)[ck]) || colors.textSoft,
    soft: (sk && (colors as any)[sk]) || colors.surface2
  }
}
