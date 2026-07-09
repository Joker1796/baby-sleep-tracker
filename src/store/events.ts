import { useMemo } from 'react'
import { create } from 'zustand'
import { uid, listEvents, putEvent, deleteEvent } from '../db'
import { touchNow, simNow } from '../time/now'

export type SleepEvent = {
  id: string
  childId: string
  type: string
  startedAt: number
  endedAt: number | null
  note: string
  amount?: number | null
  kind?: string
  planned?: boolean
  teeth?: string[]
}

interface EventsState {
  events: SleepEvent[]
  loadedFor: string | null
  load: (childId: string) => Promise<void>
  add: (event: Partial<SleepEvent> & { type: string; startedAt: number }) => Promise<SleepEvent>
  update: (event: SleepEvent) => Promise<void>
  remove: (id: string) => Promise<void>
  startInterval: (type: string, at?: number) => Promise<SleepEvent>
  endInterval: (event: SleepEvent, at?: number) => Promise<void>
  addPoint: (type: string, at?: number, note?: string) => Promise<SleepEvent>
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],
  loadedFor: null,

  async load(childId) {
    const events = await listEvents(childId)
    set({ events, loadedFor: childId })
  },

  async add(event) {
    const full: SleepEvent = {
      id: uid(),
      childId: get().loadedFor as string,
      endedAt: null,
      note: '',
      ...event
    } as SleepEvent
    await putEvent(full)
    set({ events: [...get().events, full] })
    touchNow()
    return full
  },

  async update(event) {
    const next = { ...event }
    await putEvent(next)
    set({ events: get().events.map(e => (e.id === next.id ? next : e)) })
    touchNow()
  },

  async remove(id) {
    await deleteEvent(id)
    set({ events: get().events.filter(e => e.id !== id) })
    touchNow()
  },

  // Защита от дублей (двойной тап): если интервал этого типа уже открыт —
  // не создаём второй, возвращаем существующий.
  async startInterval(type, at = simNow()) {
    const open = selectOpenInterval(get().events, type)
    if (open) return open
    return get().add({ type, startedAt: at, endedAt: null })
  },

  async endInterval(event, at = simNow()) {
    return get().update({ ...event, endedAt: at })
  },

  async addPoint(type, at = simNow(), note = '') {
    return get().add({ type, startedAt: at, endedAt: null, note })
  }
}))

// --- селекторы (замена геттеров Pinia) ---

export function selectSorted(events: SleepEvent[]): SleepEvent[] {
  return [...events].sort((a, b) => a.startedAt - b.startedAt)
}

export function selectCurrentSleep(events: SleepEvent[]): SleepEvent | null {
  return [...selectSorted(events)].reverse().find(e => e.type === 'sleep' && e.endedAt == null) || null
}

// Незавершённый интервал заданного типа (идёт прямо сейчас), или null.
export function selectOpenInterval(events: SleepEvent[], type: string): SleepEvent | null {
  return [...selectSorted(events)].reverse().find(e => e.type === type && e.endedAt == null) || null
}

// Подписываемся на стабильную ссылку events, а производную (сортировку/поиск)
// считаем в useMemo. Иначе селектор вернул бы новый массив на каждый рендер →
// useSyncExternalStore уходит в бесконечный цикл («Maximum update depth exceeded»).
export function useSorted(): SleepEvent[] {
  const events = useEventsStore(s => s.events)
  return useMemo(() => selectSorted(events), [events])
}

export function useCurrentSleep(): SleepEvent | null {
  const events = useEventsStore(s => s.events)
  return useMemo(() => selectCurrentSleep(events), [events])
}
