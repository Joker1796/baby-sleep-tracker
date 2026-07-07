import { create } from 'zustand'
import { uid, listChildren, putChild, deleteChild, deleteEventsForChild } from '../db'
import { ageInMonths } from '../logic/age'
import { seedRegimeFromNorms } from '../data/regime'
import { loadString, saveString } from './persist'

export const CHILD_COLORS = ['#7c6ff0', '#2f9e6e', '#d9598b', '#2492c9', '#d97706', '#8a5cd6']

const ACTIVE_KEY = 'activeChildId'

export type Child = any

interface ChildInput {
  name: string
  birthDate: string
  color?: string
  feeding?: string
  aids?: string[]
  gender?: string | null
}

interface ChildrenState {
  children: Child[]
  activeChildId: string | null
  loaded: boolean
  load: () => Promise<void>
  add: (input: ChildInput) => Promise<Child>
  update: (child: Child) => Promise<void>
  setRegimeMode: (id: string, mode: string) => Promise<void>
  updateRegime: (id: string, patch: any) => Promise<void>
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

  async add({ name, birthDate, color, feeding, aids, gender }) {
    const child: Child = {
      id: uid(),
      name,
      birthDate,
      color: color || CHILD_COLORS[get().children.length % CHILD_COLORS.length],
      feeding: feeding || 'breast',
      aids: aids || [],
      gender: gender || null,
      regime: { mode: 'auto' }
    }
    await putChild(child)
    set({ children: [...get().children, child] })
    get().setActive(child.id)
    return child
  },

  async update(child) {
    // Гарантируем «чистый» объект (без прокси/ссылок) перед записью.
    const plain = JSON.parse(JSON.stringify(child))
    await putChild(plain)
    set({ children: get().children.map(c => (c.id === plain.id ? plain : c)) })
  },

  // Переключение режима «Авто ⇄ Настраиваемый». При первом включении custom —
  // засеваем параметры из возрастных норм, чтобы значения были осмысленными.
  async setRegimeMode(id, mode) {
    const child = get().children.find(c => c.id === id)
    if (!child) return
    let regime
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
