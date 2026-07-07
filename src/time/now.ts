import { create } from 'zustand'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Единый реактивный «текущий момент», тикает раз в 30 секунд — от него
// пересчитываются таймеры, прогнозы и подсказки. Замена Vue-composable useNow.
//
// Для тестирования (dev) поддерживается смещение времени: можно сдвинуть «сейчас»
// вперёд/назад, и часы продолжат идти от новой точки. Смещение хранится в
// AsyncStorage и переживает перезапуск.

const OFFSET_KEY = 'devTimeOffsetMs'

// Дублируем смещение в модульную переменную ради синхронного simNow(),
// а в сторе держим для реактивного отображения dev-панелью.
let offset = 0

type NowState = { now: number; offset: number }

const useNowStore = create<NowState>(() => ({ now: Date.now(), offset: 0 }))

// Симулированный «сейчас»: реальное время плюс смещение.
export function simNow(): number {
  return Date.now() + offset
}

// События пишутся с точным временем, а тик — раз в 30 с: без немедленного
// обновления свежая запись «из будущего» не попадает в расчёты до следующего тика.
export function touchNow(): void {
  useNowStore.setState({ now: simNow() })
}

// Загрузка сохранённого смещения при старте приложения (bootstrap).
export async function loadTimeOffset(): Promise<void> {
  try {
    offset = Number(await AsyncStorage.getItem(OFFSET_KEY)) || 0
  } catch {
    offset = 0
  }
  useNowStore.setState({ now: simNow(), offset })
}

export async function setSimulatedNow(ts: number | null): Promise<void> {
  offset = ts == null ? 0 : ts - Date.now()
  try {
    await AsyncStorage.setItem(OFFSET_KEY, String(offset))
  } catch {
    /* игнор */
  }
  useNowStore.setState({ offset })
  touchNow()
}

export function resetSimulatedNow(): Promise<void> {
  return setSimulatedNow(null)
}

export function isTimeSimulated(): boolean {
  return offset !== 0
}

setInterval(() => touchNow(), 30000)

AppState.addEventListener('change', state => {
  if (state === 'active') touchNow()
})

// Хук для компонентов: возвращает текущий момент (число), ре-рендерит на тик.
export function useNow(): number {
  return useNowStore(s => s.now)
}

// Реактивное смещение для dev-панели.
export function useTimeOffset(): number {
  return useNowStore(s => s.offset)
}
