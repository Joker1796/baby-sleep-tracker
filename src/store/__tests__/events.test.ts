import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => {
  let rows: Record<string, any> = {}
  return {
    rows: () => rows,
    reset: () => {
      rows = {}
    },
    uid: vi.fn(() => `id-${Math.random().toString(36).slice(2)}`),
    listEvents: vi.fn(async (childId: string) => Object.values(rows).filter((e: any) => e.childId === childId)),
    putEvent: vi.fn(async (e: any) => {
      rows[e.id] = e
    }),
    deleteEvent: vi.fn(async (id: string) => {
      delete rows[id]
    })
  }
})

vi.mock('../../db', () => ({
  uid: db.uid,
  listEvents: db.listEvents,
  putEvent: db.putEvent,
  deleteEvent: db.deleteEvent
}))

const time = vi.hoisted(() => ({ now: 1_000_000_000 }))
vi.mock('../../time/now', () => ({
  simNow: () => time.now,
  touchNow: () => {}
}))

import { useEventsStore, selectOpenInterval, selectCurrentSleep, selectSorted } from '../events'

function reset() {
  db.reset()
  useEventsStore.setState({ events: [], loadedFor: 'child-1' })
}

describe('events store', () => {
  beforeEach(reset)

  it('add: событие получает id, childId и попадает в БД и стор', async () => {
    const ev = await useEventsStore.getState().add({ type: 'sleep', startedAt: 100 })
    expect(ev.id).toBeTruthy()
    expect(ev.childId).toBe('child-1')
    expect(useEventsStore.getState().events).toHaveLength(1)
    expect(db.rows()[ev.id]).toBeTruthy()
  })

  it('startInterval: повторный вызов не создаёт дубль открытого интервала', async () => {
    const store = useEventsStore.getState()
    const first = await store.startInterval('sleep')
    const second = await store.startInterval('sleep')
    expect(second.id).toBe(first.id)
    expect(useEventsStore.getState().events).toHaveLength(1)
  })

  it('endInterval закрывает интервал, после чего startInterval создаёт новый', async () => {
    const store = useEventsStore.getState()
    const first = await store.startInterval('sleep')
    await store.endInterval(first, time.now + 60000)
    const second = await store.startInterval('sleep')
    expect(second.id).not.toBe(first.id)
    expect(useEventsStore.getState().events).toHaveLength(2)
  })

  it('remove удаляет из стора и БД', async () => {
    const ev = await useEventsStore.getState().add({ type: 'poop', startedAt: 100 })
    await useEventsStore.getState().remove(ev.id)
    expect(useEventsStore.getState().events).toHaveLength(0)
    expect(db.rows()[ev.id]).toBeUndefined()
  })

  it('гонка load: медленный ранний ответ не перетирает поздний', async () => {
    db.listEvents.mockImplementationOnce(async () => {
      await new Promise(r => setTimeout(r, 30))
      return [{ id: 'a', childId: 'A', type: 'sleep', startedAt: 1, endedAt: null, note: '' }]
    })
    db.listEvents.mockImplementationOnce(async () => [
      { id: 'b', childId: 'B', type: 'sleep', startedAt: 2, endedAt: null, note: '' }
    ])
    const store = useEventsStore.getState()
    await Promise.all([store.load('A'), store.load('B')])
    expect(useEventsStore.getState().loadedFor).toBe('B')
    expect(useEventsStore.getState().events.map(e => e.id)).toEqual(['b'])
  })
})

describe('селекторы', () => {
  const mk = (id: string, type: string, startedAt: number, endedAt: number | null = null) =>
    ({ id, childId: 'c', type, startedAt, endedAt, note: '' })

  it('selectSorted сортирует по startedAt, не мутируя исходный массив', () => {
    const events = [mk('b', 'sleep', 200), mk('a', 'sleep', 100)]
    const sorted = selectSorted(events as any)
    expect(sorted.map(e => e.id)).toEqual(['a', 'b'])
    expect(events[0].id).toBe('b')
  })

  it('selectOpenInterval: из нескольких открытых берёт начатый позже', () => {
    const events = [mk('a', 'walk', 100), mk('b', 'walk', 300), mk('c', 'walk', 200, 250)]
    expect(selectOpenInterval(events as any, 'walk')?.id).toBe('b')
  })

  it('selectCurrentSleep: null, когда все сны завершены', () => {
    const events = [mk('a', 'sleep', 100, 200)]
    expect(selectCurrentSleep(events as any)).toBeNull()
  })
})
