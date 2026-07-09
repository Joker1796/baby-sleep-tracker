import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSettlingStore } from '../settling'

const time = vi.hoisted(() => ({ now: new Date('2025-06-10T10:00:00').getTime() }))
vi.mock('../../time/now', () => ({
  simNow: () => time.now,
  touchNow: () => {}
}))

vi.mock('../persist', () => ({
  loadJSON: vi.fn(async (_key: string, fallback: unknown) => fallback),
  saveJSON: vi.fn()
}))

function reset() {
  time.now = new Date('2025-06-10T10:00:00').getTime()
  useSettlingStore.setState({
    sessions: {},
    extensions: {},
    dismissed: { greeting: {}, milestone: {}, encouragement: {}, aidsHint: {} },
    adviceDismissed: {}
  })
}

describe('сессии укладывания', () => {
  beforeEach(reset)

  it('start/setLocation/clear — жизненный цикл сессии', () => {
    const s = useSettlingStore.getState()
    s.start('c1')
    expect(useSettlingStore.getState().get('c1')).toEqual({ startedAt: time.now, location: null })
    useSettlingStore.getState().setLocation('c1', 'home')
    expect(useSettlingStore.getState().get('c1')?.location).toBe('home')
    useSettlingStore.getState().clear('c1')
    expect(useSettlingStore.getState().get('c1')).toBeNull()
  })

  it('setLocation без начатой сессии — no-op', () => {
    useSettlingStore.getState().setLocation('c1', 'home')
    expect(useSettlingStore.getState().get('c1')).toBeNull()
  })

  it('сессии независимы по детям', () => {
    useSettlingStore.getState().start('c1')
    expect(useSettlingStore.getState().get('c2')).toBeNull()
  })
})

describe('скрытие карточек до конца дня', () => {
  beforeEach(reset)

  it('dismiss действует до конца дня, наутро сбрасывается', () => {
    const s = useSettlingStore.getState()
    s.dismiss('greeting', 'c1')
    expect(useSettlingStore.getState().isDismissed('greeting', 'c1')).toBe(true)
    // другой вид и другой ребёнок не затронуты
    expect(useSettlingStore.getState().isDismissed('milestone', 'c1')).toBe(false)
    expect(useSettlingStore.getState().isDismissed('greeting', 'c2')).toBe(false)
    // следующий день
    time.now += 24 * 3600 * 1000
    expect(useSettlingStore.getState().isDismissed('greeting', 'c1')).toBe(false)
  })

  it('dismissAdvice копит id за день и сбрасывается назавтра', () => {
    const s = useSettlingStore.getState()
    s.dismissAdvice('c1', 'a1')
    useSettlingStore.getState().dismissAdvice('c1', 'a2')
    expect(useSettlingStore.getState().isAdviceDismissed('c1', 'a1')).toBe(true)
    expect(useSettlingStore.getState().isAdviceDismissed('c1', 'a2')).toBe(true)
    expect(useSettlingStore.getState().isAdviceDismissed('c1', 'a3')).toBe(false)
    time.now += 24 * 3600 * 1000
    expect(useSettlingStore.getState().isAdviceDismissed('c1', 'a1')).toBe(false)
  })
})
