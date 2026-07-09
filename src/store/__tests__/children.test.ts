import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  let children: Record<string, any> = {}
  return {
    reset: () => {
      children = {}
    },
    rows: () => children,
    uid: vi.fn(() => `id-${Math.random().toString(36).slice(2)}`),
    listChildren: vi.fn(async () => Object.values(children)),
    putChild: vi.fn(async (c: any) => {
      children[c.id] = c
    }),
    deleteChild: vi.fn(async (id: string) => {
      delete children[id]
    }),
    deleteEventsForChild: vi.fn(async () => {})
  }
})

vi.mock('../../db', () => ({
  uid: db.uid,
  listChildren: db.listChildren,
  putChild: db.putChild,
  deleteChild: db.deleteChild,
  deleteEventsForChild: db.deleteEventsForChild
}))

vi.mock('../persist', () => ({
  loadString: vi.fn(async () => null),
  saveString: vi.fn()
}))

import { useChildrenStore, selectActiveChild } from '../children'

function reset() {
  db.reset()
  useChildrenStore.setState({ children: [], activeChildId: null, loaded: false })
}

const input = { name: 'Миша', birthDate: '2025-01-15' }

describe('children store', () => {
  beforeEach(reset)

  it('add: заполняет дефолты и делает ребёнка активным', async () => {
    const child = await useChildrenStore.getState().add(input)
    expect(child.feeding).toBe('breast')
    expect(child.regime?.mode).toBe('auto')
    expect(useChildrenStore.getState().activeChildId).toBe(child.id)
    expect(db.rows()[child.id]).toBeTruthy()
  })

  it('toggleRegimeMode: auto → custom засевает параметры из норм, custom → auto сохраняет их', async () => {
    const child = await useChildrenStore.getState().add(input)
    await useChildrenStore.getState().toggleRegimeMode(child.id)
    const custom = useChildrenStore.getState().children[0]
    expect(custom.regime?.mode).toBe('custom')
    expect(custom.regime?.wakeWindow).toBeGreaterThan(0)

    await useChildrenStore.getState().toggleRegimeMode(child.id)
    const auto = useChildrenStore.getState().children[0]
    expect(auto.regime?.mode).toBe('auto')
    // параметры не потеряны — повторное включение custom вернёт их
    expect(auto.regime?.wakeWindow).toBe(custom.regime?.wakeWindow)
  })

  it('updateRegime патчит параметры, не трогая остальные', async () => {
    const child = await useChildrenStore.getState().add(input)
    await useChildrenStore.getState().setRegimeMode(child.id, 'custom')
    const before = useChildrenStore.getState().children[0].regime
    await useChildrenStore.getState().updateRegime(child.id, { napCount: 4 })
    const after = useChildrenStore.getState().children[0].regime
    expect(after?.napCount).toBe(4)
    expect(after?.wakeWindow).toBe(before?.wakeWindow)
  })

  it('remove активного ребёнка переключает на следующего, последнего — в null', async () => {
    const a = await useChildrenStore.getState().add(input)
    const b = await useChildrenStore.getState().add({ name: 'Аня', birthDate: '2024-05-01' })
    useChildrenStore.getState().setActive(a.id)

    await useChildrenStore.getState().remove(a.id)
    expect(db.deleteEventsForChild).toHaveBeenCalledWith(a.id)
    expect(useChildrenStore.getState().activeChildId).toBe(b.id)

    await useChildrenStore.getState().remove(b.id)
    expect(useChildrenStore.getState().activeChildId).toBeNull()
    expect(selectActiveChild(useChildrenStore.getState())).toBeNull()
  })
})
