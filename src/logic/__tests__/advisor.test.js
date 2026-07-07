import { describe, it, expect } from 'vitest'
import dayjs from 'dayjs'
import { buildAdvice } from '../advisor'

const ts = s => dayjs(s).valueOf()

// 5 месяцев на 4 июля 2026 → нормы 4–6 мес: окно 120–150 мин (среднее 135)
const child = { id: 'c1', name: 'Тест', birthDate: '2026-02-01' }

function sleep(start, end) {
  return { id: start, type: 'sleep', startedAt: ts(start), endedAt: end ? ts(end) : null }
}

describe('buildAdvice: прогноз следующего сна', () => {
  it('обычный сон → следующее укладывание через среднее окно', () => {
    const a = buildAdvice({
      child,
      events: [sleep('2026-07-04T12:30', '2026-07-04T14:00')],
      now: ts('2026-07-04T15:00')
    })
    expect(a.ageM).toBe(5)
    expect(a.nextNapAt).toBe(ts('2026-07-04T14:00') + 135 * 60000)
    expect(Math.round(a.wakeWindowLeft)).toBe(75)
  })

  it('короткий сон → окно сокращается, укладывание раньше', () => {
    const short = buildAdvice({
      child,
      events: [sleep('2026-07-04T13:30', '2026-07-04T14:00')], // 30 мин
      now: ts('2026-07-04T14:30')
    })
    // окно после короткого сна: max(120*0.75, 120-20) = 100 мин
    expect(short.wakeWindowMin).toBe(100)
    expect(short.nextNapAt).toBe(ts('2026-07-04T14:00') + 100 * 60000)
    expect(short.advices.map(x => x.id)).toContain('short-nap')
  })

  it('во время сна прогноз следующего сна не строится', () => {
    const a = buildAdvice({
      child,
      events: [sleep('2026-07-04T14:00', null)],
      now: ts('2026-07-04T14:30')
    })
    expect(a.nextNapAt).toBeNull()
    expect(a.state.sleeping).not.toBeNull()
  })
})

describe('buildAdvice: правила', () => {
  it('перегул → срочная подсказка', () => {
    const a = buildAdvice({
      child,
      events: [sleep('2026-07-04T09:00', '2026-07-04T10:00')],
      now: ts('2026-07-04T12:40') // бодрствует 160 мин при окне 135
    })
    expect(a.wakeWindowLeft).toBeLessThan(0)
    const ids = a.advices.map(x => x.id)
    expect(ids).toContain('window-exceeded')
    expect(a.advices.find(x => x.id === 'window-exceeded').priority).toBe(3)
  })

  it('окно на исходе → подсказка про ритуал', () => {
    const a = buildAdvice({
      child,
      events: [sleep('2026-07-04T09:00', '2026-07-04T10:00')],
      now: ts('2026-07-04T12:05') // осталось 10 мин из 135
    })
    expect(a.advices.map(x => x.id)).toContain('window-soon')
  })

  it('нет данных о сне → просьба отметить', () => {
    const a = buildAdvice({ child, events: [], now: ts('2026-07-04T12:00') })
    expect(a.nextNapAt).toBeNull()
    expect(a.advices.map(x => x.id)).toContain('log-morning')
  })

  it('дефицит дневного сна вечером → раннее укладывание', () => {
    const a = buildAdvice({
      child,
      events: [sleep('2026-07-04T13:00', '2026-07-04T14:00')], // 60 мин при норме от 180
      now: ts('2026-07-04T17:00')
    })
    const ids = a.advices.map(x => x.id)
    expect(ids).toContain('day-sleep-deficit')
    // укладывание сдвинуто раньше стандартного 19:30
    expect(a.bedtimeAt).toBeLessThan(ts('2026-07-04T19:30'))
  })

  it('возрастная подсказка о регрессе 4 месяцев', () => {
    const fourMonths = { ...child, birthDate: '2026-03-01' } // ровно 4 мес
    const a = buildAdvice({ child: fourMonths, events: [], now: ts('2026-07-04T12:00') })
    expect(a.advices.map(x => x.id)).toContain('regression-4m')
  })

  it('пеленание после 2 месяцев → предупреждение, помечено как совет из профиля', () => {
    const swaddled = { ...child, aids: ['swaddle'] }
    const a = buildAdvice({ child: swaddled, events: [], now: ts('2026-07-04T12:00') })
    const rule = a.advices.find(x => x.id === 'swaddle-stop')
    expect(rule).toBeTruthy()
    expect(rule.profile).toBe(true)
    // без пеленания правило не срабатывает
    const plain = buildAdvice({ child, events: [], now: ts('2026-07-04T12:00') })
    expect(plain.advices.map(x => x.id)).not.toContain('swaddle-stop')
  })

  it('засыпание на груди после 4 мес вечером → совет про ассоциацию, текст зависит от кормления', () => {
    const events = [sleep('2026-07-04T15:00', '2026-07-04T16:00')]
    const now = ts('2026-07-04T17:30')
    const bf = buildAdvice({ child: { ...child, feeding: 'breast', aids: ['feeding-to-sleep'] }, events, now })
    const bfAdvice = bf.advices.find(x => x.id === 'feeding-to-sleep-assoc')
    expect(bfAdvice).toBeTruthy()
    expect(bfAdvice.text).toContain('на груди')
    const ff = buildAdvice({ child: { ...child, feeding: 'formula', aids: ['feeding-to-sleep'] }, events, now })
    expect(ff.advices.find(x => x.id === 'feeding-to-sleep-assoc').text).toContain('с бутылочкой')
  })

  it('текст про перегул учитывает белый шум из профиля', () => {
    const events = [sleep('2026-07-04T08:00', '2026-07-04T09:00')]
    const now = ts('2026-07-04T12:00') // 180 мин бодрствования при окне 135 → перегул > 30 мин
    const noAids = buildAdvice({ child, events, now })
    expect(noAids.advices.find(x => x.id === 'window-exceeded-hard').text).toContain('шшш')
    const withNoise = buildAdvice({ child: { ...child, aids: ['white-noise'] }, events, now })
    expect(withNoise.advices.find(x => x.id === 'window-exceeded-hard').text).toContain('белый шум')
  })

  it('правила отсортированы по приоритету', () => {
    const a = buildAdvice({
      child,
      events: [sleep('2026-07-04T09:00', '2026-07-04T10:00')],
      now: ts('2026-07-04T12:40')
    })
    const priorities = a.advices.map(x => x.priority)
    expect(priorities).toEqual([...priorities].sort((x, y) => y - x))
  })
})
