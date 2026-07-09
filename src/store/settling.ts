import { create } from 'zustand'
import { touchNow, simNow } from '../time/now'
import { loadJSON, saveJSON } from './persist'

const KEY = 'settlingSessions'
const EXT_KEY = 'napExtensions'
const DISMISS_KEY = 'greetingDismissed'
const MILESTONE_KEY = 'milestoneDismissed'
const ADVICE_KEY = 'adviceDismissed'
const ENCOURAGE_KEY = 'encouragementDismissed'
const AIDS_KEY = 'aidsHintDismissed'

type Dict = Record<string, any>

interface SettlingState {
  sessions: Dict
  extensions: Dict
  greetingDismissed: Dict
  milestoneDismissed: Dict
  adviceDismissed: Dict
  encouragementDismissed: Dict
  aidsHintDismissed: Dict
  load: () => Promise<void>
  get: (childId: string) => any
  getExtension: (childId: string) => any
  startExtension: (childId: string) => void
  clearExtension: (childId: string) => void
  start: (childId: string) => void
  setLocation: (childId: string, location: string) => void
  clear: (childId: string) => void
  dismissGreeting: (childId: string) => void
  isGreetingDismissed: (childId: string) => boolean
  dismissMilestone: (childId: string) => void
  isMilestoneDismissed: (childId: string) => boolean
  dismissEncouragement: (childId: string) => void
  isEncouragementDismissed: (childId: string) => boolean
  dismissAdvice: (childId: string, adviceId: string) => void
  isAdviceDismissed: (childId: string, adviceId: string) => boolean
  dismissAidsHint: (childId: string) => void
  isAidsHintDismissed: (childId: string) => boolean
}

// Эфемерная сессия «укладывания» на ребёнка: когда начата и где укладывают.
// Живёт до момента «Уснул» или отмены. Персист в AsyncStorage.
export const useSettlingStore = create<SettlingState>((set, get) => ({
  sessions: {},
  extensions: {},
  greetingDismissed: {},
  milestoneDismissed: {},
  adviceDismissed: {},
  encouragementDismissed: {},
  aidsHintDismissed: {},

  async load() {
    const [sessions, extensions, greetingDismissed, milestoneDismissed, adviceDismissed, encouragementDismissed, aidsHintDismissed] =
      await Promise.all([
        loadJSON<Dict>(KEY, {}),
        loadJSON<Dict>(EXT_KEY, {}),
        loadJSON<Dict>(DISMISS_KEY, {}),
        loadJSON<Dict>(MILESTONE_KEY, {}),
        loadJSON<Dict>(ADVICE_KEY, {}),
        loadJSON<Dict>(ENCOURAGE_KEY, {}),
        loadJSON<Dict>(AIDS_KEY, {})
      ])
    set({ sessions, extensions, greetingDismissed, milestoneDismissed, adviceDismissed, encouragementDismissed, aidsHintDismissed })
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
    saveJSON(KEY, sessions)
  },
  setLocation(childId, location) {
    const current = get().sessions[childId]
    if (!current) return
    const sessions = { ...get().sessions, [childId]: { ...current, location } }
    set({ sessions })
    saveJSON(KEY, sessions)
  },
  clear(childId) {
    if (!get().sessions[childId]) return
    const sessions = { ...get().sessions }
    delete sessions[childId]
    set({ sessions })
    saveJSON(KEY, sessions)
    touchNow()
  },

  dismissGreeting(childId) {
    const greetingDismissed = { ...get().greetingDismissed, [childId]: new Date(simNow()).toDateString() }
    set({ greetingDismissed })
    saveJSON(DISMISS_KEY, greetingDismissed)
  },
  isGreetingDismissed(childId) {
    return get().greetingDismissed[childId] === new Date(simNow()).toDateString()
  },
  dismissMilestone(childId) {
    const milestoneDismissed = { ...get().milestoneDismissed, [childId]: new Date(simNow()).toDateString() }
    set({ milestoneDismissed })
    saveJSON(MILESTONE_KEY, milestoneDismissed)
  },
  isMilestoneDismissed(childId) {
    return get().milestoneDismissed[childId] === new Date(simNow()).toDateString()
  },
  dismissEncouragement(childId) {
    const encouragementDismissed = { ...get().encouragementDismissed, [childId]: new Date(simNow()).toDateString() }
    set({ encouragementDismissed })
    saveJSON(ENCOURAGE_KEY, encouragementDismissed)
  },
  isEncouragementDismissed(childId) {
    return get().encouragementDismissed[childId] === new Date(simNow()).toDateString()
  },

  // Крестик скрывает конкретную профильную подсказку до конца дня.
  // Модель: childId → { date, ids: [adviceId] }.
  dismissAdvice(childId, adviceId) {
    const today = new Date(simNow()).toDateString()
    const entry = get().adviceDismissed[childId]
    const ids = entry && typeof entry === 'object' && entry.date === today ? [...entry.ids] : []
    if (!ids.includes(adviceId)) ids.push(adviceId)
    const adviceDismissed = { ...get().adviceDismissed, [childId]: { date: today, ids } }
    set({ adviceDismissed })
    saveJSON(ADVICE_KEY, adviceDismissed)
  },
  isAdviceDismissed(childId, adviceId) {
    const entry = get().adviceDismissed[childId]
    if (!entry || typeof entry !== 'object') return false
    return entry.date === new Date(simNow()).toDateString() && entry.ids.includes(adviceId)
  },
  dismissAidsHint(childId) {
    const aidsHintDismissed = { ...get().aidsHintDismissed, [childId]: new Date(simNow()).toDateString() }
    set({ aidsHintDismissed })
    saveJSON(AIDS_KEY, aidsHintDismissed)
  },
  isAidsHintDismissed(childId) {
    return get().aidsHintDismissed[childId] === new Date(simNow()).toDateString()
  }
}))
