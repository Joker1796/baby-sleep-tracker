import { create } from 'zustand'
import { touchNow, simNow } from '../time/now'
import { loadJSON, saveJSON } from './persist'

const SESSIONS_KEY = 'settlingSessions'
const EXT_KEY = 'napExtensions'
const ADVICE_KEY = 'adviceDismissed'

// Карточки, скрываемые крестиком до конца дня. Ключи хранения — как в старых
// версиях, чтобы не терять состояние после обновления приложения.
export type DismissKind = 'greeting' | 'milestone' | 'encouragement' | 'aidsHint'
const DISMISS_KEYS: Record<DismissKind, string> = {
  greeting: 'greetingDismissed',
  milestone: 'milestoneDismissed',
  encouragement: 'encouragementDismissed',
  aidsHint: 'aidsHintDismissed'
}
const DISMISS_KINDS = Object.keys(DISMISS_KEYS) as DismissKind[]

type Dict = Record<string, any>

export type SettlingSession = { startedAt: number; location: string | null }
export type NapExtension = { startedAt: number }

interface SettlingState {
  sessions: Record<string, SettlingSession>
  extensions: Record<string, NapExtension>
  dismissed: Record<DismissKind, Dict>
  adviceDismissed: Dict
  load: () => Promise<void>
  get: (childId: string) => SettlingSession | null
  getExtension: (childId: string) => NapExtension | null
  startExtension: (childId: string) => void
  clearExtension: (childId: string) => void
  start: (childId: string) => void
  setLocation: (childId: string, location: string | null) => void
  clear: (childId: string) => void
  dismiss: (kind: DismissKind, childId: string) => void
  isDismissed: (kind: DismissKind, childId: string) => boolean
  dismissAdvice: (childId: string, adviceId: string) => void
  isAdviceDismissed: (childId: string, adviceId: string) => boolean
}

const today = () => new Date(simNow()).toDateString()

// Эфемерная сессия «укладывания» на ребёнка: когда начата и где укладывают.
// Живёт до момента «Уснул» или отмены. Персист в AsyncStorage.
export const useSettlingStore = create<SettlingState>((set, get) => ({
  sessions: {},
  extensions: {},
  dismissed: { greeting: {}, milestone: {}, encouragement: {}, aidsHint: {} },
  adviceDismissed: {},

  async load() {
    const [sessions, extensions, adviceDismissed, ...dismissedByKind] = await Promise.all([
      loadJSON<Dict>(SESSIONS_KEY, {}),
      loadJSON<Dict>(EXT_KEY, {}),
      loadJSON<Dict>(ADVICE_KEY, {}),
      ...DISMISS_KINDS.map(kind => loadJSON<Dict>(DISMISS_KEYS[kind], {}))
    ])
    const dismissed = Object.fromEntries(DISMISS_KINDS.map((kind, i) => [kind, dismissedByKind[i]])) as Record<DismissKind, Dict>
    set({ sessions, extensions, adviceDismissed, dismissed })
  },

  get(childId) {
    return get().sessions[childId] || null
  },
  getExtension(childId) {
    return get().extensions[childId] || null
  },
  startExtension(childId) {
    const extensions = { ...get().extensions, [childId]: { startedAt: simNow() } }
    set({ extensions })
    saveJSON(EXT_KEY, extensions)
    touchNow()
  },
  clearExtension(childId) {
    if (!get().extensions[childId]) return
    const extensions = { ...get().extensions }
    delete extensions[childId]
    set({ extensions })
    saveJSON(EXT_KEY, extensions)
    touchNow()
  },
  start(childId) {
    const sessions = { ...get().sessions, [childId]: { startedAt: simNow(), location: null } }
    set({ sessions })
    saveJSON(SESSIONS_KEY, sessions)
  },
  setLocation(childId, location) {
    const current = get().sessions[childId]
    if (!current) return
    const sessions = { ...get().sessions, [childId]: { ...current, location } }
    set({ sessions })
    saveJSON(SESSIONS_KEY, sessions)
  },
  clear(childId) {
    if (!get().sessions[childId]) return
    const sessions = { ...get().sessions }
    delete sessions[childId]
    set({ sessions })
    saveJSON(SESSIONS_KEY, sessions)
    touchNow()
  },

  // Крестик скрывает карточку данного вида до конца дня.
  dismiss(kind, childId) {
    const forKind = { ...get().dismissed[kind], [childId]: today() }
    set({ dismissed: { ...get().dismissed, [kind]: forKind } })
    saveJSON(DISMISS_KEYS[kind], forKind)
  },
  isDismissed(kind, childId) {
    return get().dismissed[kind][childId] === today()
  },

  // Крестик скрывает конкретную профильную подсказку до конца дня.
  // Модель: childId → { date, ids: [adviceId] }.
  dismissAdvice(childId, adviceId) {
    const date = today()
    const entry = get().adviceDismissed[childId]
    const ids = entry && typeof entry === 'object' && entry.date === date ? [...entry.ids] : []
    if (!ids.includes(adviceId)) ids.push(adviceId)
    const adviceDismissed = { ...get().adviceDismissed, [childId]: { date, ids } }
    set({ adviceDismissed })
    saveJSON(ADVICE_KEY, adviceDismissed)
  },
  isAdviceDismissed(childId, adviceId) {
    const entry = get().adviceDismissed[childId]
    if (!entry || typeof entry !== 'object') return false
    return entry.date === today() && entry.ids.includes(adviceId)
  }
}))

// --- реактивные хуки для компонентов (точечные подписки вместо всего стора) ---

export function useSettlingSession(childId: string | undefined): SettlingSession | null {
  return useSettlingStore(s => (childId ? s.sessions[childId] : null) || null)
}

export function useNapExtension(childId: string | undefined): NapExtension | null {
  return useSettlingStore(s => (childId ? s.extensions[childId] : null) || null)
}

export function useDismissedToday(kind: DismissKind, childId: string | undefined): boolean {
  return useSettlingStore(s => (childId ? s.dismissed[kind][childId] === today() : false))
}

// Запись о скрытых подсказках ребёнка ({ date, ids }) — стабильная ссылка до изменения.
export function useDismissedAdvice(childId: string | undefined): { date: string; ids: string[] } | null {
  return useSettlingStore(s => (childId ? s.adviceDismissed[childId] : null) || null)
}
