import { create } from 'zustand'
import { uid, listChildren, putChild, deleteChild, deleteEventsForChild } from '../db'
import { ageInMonths } from '../logic/age'
import { seedRegimeFromNorms } from '../data/regime'
import { DEFAULT_MAIN_BUTTONS } from '../data/eventTypes'
import { loadString, saveString } from './persist'

export const CHILD_COLORS = ['#7c6ff0', '#2f9e6e', '#d9598b', '#2492c9', '#d97706', '#8a5cd6']

const ACTIVE_KEY = 'activeChildId'

// Кнопка на главном экране: тип события и режим кнопки
// ('time' — засекает длительность, 'count' — считает нажатия).
export interface MainButton {
  type: string
  mode: 'time' | 'count'
}

// Настраиваемый режим сна (переопределяет возрастные нормы). mode: 'auto' —
// авторасчёт по возрасту, остальные поля игнорируются.
export interface ChildRegime {
  mode: 'auto' | 'custom'
  wakeWindow?: number
  napCount?: number
  napDurationMin?: number
  dayStart?: string
  nightStart?: string
  morningWake?: string
  nightSleepMin?: number
  windDownMin?: number
  shortNapReduce?: boolean
}

// Профиль ребёнка. Записи из старых версий/бэкапов могут не иметь части
// полей — всё, кроме идентичности, опционально.
export interface Child {
  id: string
  name: string
  birthDate: string // 'YYYY-MM-DD'
  color: string
  feeding?: string
  aids?: string[]
  gender?: string | null
  mainButtons?: MainButton[]
  hideHints?: boolean
  regime?: ChildRegime
}

interface ChildInput {
  name: string
  birthDate: string
  color?: string
  feeding?: string
  aids?: string[]
  gender?: string | null
  mainButtons?: MainButton[]
  hideHints?: boolean
}

interface ChildrenState {
  children: Child[]
  activeChildId: string | null
  loaded: boolean
  load: () => Promise<void>
  add: (input: ChildInput) => Promise<Child>
  update: (child: Child) => Promise<void>
  setRegimeMode: (id: string, mode: ChildRegime['mode']) => Promise<void>
  toggleRegimeMode: (id: string) => Promise<void>
  updateRegime: (id: string, patch: Partial<ChildRegime>) => Promise<void>
  remove: (id: string) => Promise<void>
  setActive: (id: string | null) => void
}

export const useChildrenStore = create<ChildrenState>((set, get) => ({
  children: [],
  activeChildId: null,
  loaded: false,

  async load() {
    const children = await listChildren()
    const activeChildId = await loadString(ACTIVE_KEY)
    set({ children, activeChildId, loaded: true })
  },

  async add({ name, birthDate, color, feeding, aids, gender, mainButtons, hideHints }) {
    const child: Child = {
      id: uid(),
      name,
      birthDate,
      color: color || CHILD_COLORS[get().children.length % CHILD_COLORS.length],
      feeding: feeding || 'breast',
      aids: aids || [],
      gender: gender || null,
      mainButtons: mainButtons || DEFAULT_MAIN_BUTTONS,
      hideHints: hideHints || false,
      regime: { mode: 'auto' }
    }
    await putChild(child)
    set({ children: [...get().children, child] })
    get().setActive(child.id)
    return child
  },

  async update(child) {
    // Гарантируем «чистый» объект (без прокси/ссылок) перед записью.
    const plain: Child = JSON.parse(JSON.stringify(child))
    await putChild(plain)
    set({ children: get().children.map(c => (c.id === plain.id ? plain : c)) })
  },

  // Переключение режима «Авто ⇄ Настраиваемый». При первом включении custom —
  // засеваем параметры из возрастных норм, чтобы значения были осмысленными.
  async setRegimeMode(id, mode) {
    const child = get().children.find(c => c.id === id)
    if (!child) return
    let regime: ChildRegime
    if (mode === 'custom') {
      regime =
        child.regime && child.regime.wakeWindow != null
          ? { ...child.regime, mode: 'custom' }
          : seedRegimeFromNorms(ageInMonths(child.birthDate))
    } else {
      regime = { ...(child.regime || {}), mode: 'auto' }
    }
    await get().update({ ...child, regime })
  },

  async toggleRegimeMode(id) {
    const child = get().children.find(c => c.id === id)
    if (!child) return
    await get().setRegimeMode(id, child.regime?.mode === 'custom' ? 'auto' : 'custom')
  },

  async updateRegime(id, patch) {
    const child = get().children.find(c => c.id === id)
    if (!child) return
    await get().update({ ...child, regime: { ...(child.regime || { mode: 'custom' }), ...patch } })
  },

  async remove(id) {
    await deleteEventsForChild(id)
    await deleteChild(id)
    const children = get().children.filter(c => c.id !== id)
    set({ children })
    if (get().activeChildId === id) get().setActive(children[0]?.id || null)
  },

  setActive(id) {
    set({ activeChildId: id })
    saveString(ACTIVE_KEY, id)
  }
}))

// Активный ребёнок (замена геттера activeChild). Хук для компонентов.
export function useActiveChild(): Child | null {
  return useChildrenStore(s => s.children.find(c => c.id === s.activeChildId) || s.children[0] || null)
}

export function selectActiveChild(state: ChildrenState): Child | null {
  return state.children.find(c => c.id === state.activeChildId) || state.children[0] || null
}
