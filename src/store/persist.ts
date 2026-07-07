import AsyncStorage from '@react-native-async-storage/async-storage'

// Тонкие обёртки над AsyncStorage для JSON — замена синхронного localStorage
// из web-версии. Запись выполняется «в фоне» (fire-and-forget): состояние в
// сторе уже обновлено, персист не должен блокировать UI.

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {})
}

export async function loadString(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key)
  } catch {
    return null
  }
}

export function saveString(key: string, value: string | null): void {
  if (value == null) AsyncStorage.removeItem(key).catch(() => {})
  else AsyncStorage.setItem(key, value).catch(() => {})
}
