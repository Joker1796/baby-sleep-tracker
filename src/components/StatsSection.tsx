import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'
import dayjs from 'dayjs'
import { useSorted } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow } from '../time/now'
import { analyzeDay } from '../logic/sleepAnalyzer'
import { ageInMonths, formatDurationMin } from '../logic/age'
import { getNorms } from '../data/sleepNorms'
import { EVENT_TYPES, NON_SLEEP_TYPE_LIST } from '../data/eventTypes'
import { dayCount, dayTotalMin } from '../logic/eventStats'
import { animateLayout } from '../utils/animation'
import { Card, Btn, KeyValueRow } from './ui'
import SchedulePlanner from './SchedulePlanner'
import SelectInput from './SelectInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

// Служебные типы, которые не выводим в выбор метрики статистики.
const STATS_EXCLUDE = new Set([
  'doctor',
  'vitaminD',
  'temperature',
  'vaccination',
  'pool',
  'club',
  'nails',
  'bath',
  'massage',
  'feedLeft',
  'feedRight'
])

const W = 340
const H = 190
const PAD = { top: 8, right: 6, bottom: 22, left: 26 }
const MAX_H = 20
const chartW = W - PAD.left - PAD.right
const chartH = H - PAD.top - PAD.bottom

function y(hours: number) {
  return PAD.top + chartH - (Math.min(hours, MAX_H) / MAX_H) * chartH
}

// Статистика сна/событий и распорядок дня — раскрываемые секции внутри «Истории».
// Период (7/14/30 дней) общий: влияет и на графики, и на усреднение распорядка.
export default function StatsSection() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const events = useSorted()
  const child = useActiveChild()
  const now = useNow()

  const [days, setDays] = useState(7)
  const [metric, setMetric] = useState('sleep')
  const [showStats, setShowStats] = useState(false)

  const usedEventTypes = useMemo(() => {
    const presentTypes = new Set(events.filter(e => !e.planned && e.type !== 'sleep').map(e => e.type))
    return NON_SLEEP_TYPE_LIST.filter(t => presentTypes.has(t.id) && !STATS_EXCLUDE.has(t.id))
  }, [events])
  const metricDef = metric === 'sleep' ? null : EVENT_TYPES[metric]

  // Текущий день не включаем — статистика по завершённым дням (вчера и назад).
  // Считаем только когда секция развёрнута: analyzeDay × 30 дней — дорогая операция.
  const stats: any[] = useMemo(() => {
    if (!showStats) return []
    const result = []
    for (let i = days; i >= 1; i--) {
      const dayTs = dayjs(now).startOf('day').subtract(i, 'day').valueOf()
      result.push({ dayTs, ...analyzeDay(events, dayTs, now) })
    }
    return result
  }, [showStats, events, days, now])

  const norms = child ? getNorms(ageInMonths(child.birthDate, now)) : null

  const slot = chartW / Math.max(1, stats.length)
  const barW = Math.min(slot * 0.62, 30)
  const bars = useMemo(
    () =>
      stats.map((d, i) => {
        const x = PAD.left + slot * i + (slot - barW) / 2
        const nightH = d.nightSleepMin / 60
        const dayH = d.daySleepMin / 60
        return {
          x,
          nightY: y(nightH),
          nightHpx: y(0) - y(nightH),
          dayY: y(nightH + dayH),
          dayHpx: y(nightH) - y(nightH + dayH),
          label: dayjs(d.dayTs).format('D.MM')
        }
      }),
    [stats, slot, barW]
  )
  const gridLines = [4, 8, 12, 16, 20].map(h => ({ h, y: y(h) }))

  const { eventBars, eventAvg } = useMemo(() => {
    if (metric === 'sleep' || !stats.length) return { eventBars: [] as any[], eventAvg: null as number | null }
    const def = EVENT_TYPES[metric]
    const valueForDay = (ts: number) => {
      if (def?.amountUnit && def.amountAgg === 'sum') {
        return events
          .filter(e => e.type === metric && !e.planned && dayjs(e.startedAt).isSame(dayjs(ts), 'day'))
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      }
      if (def?.kind === 'interval') return dayTotalMin(events, metric, ts, now)
      return dayCount(events, metric, ts)
    }
    const series = stats.map(d => ({ dayTs: d.dayTs, value: valueForDay(d.dayTs) }))
    const max = Math.max(1, ...series.map(e => e.value))
    const eventBars = series.map((e, i) => {
      const x = PAD.left + slot * i + (slot - barW) / 2
      const hpx = (e.value / max) * chartH
      return { x, y: PAD.top + chartH - hpx, hpx, value: e.value, label: dayjs(e.dayTs).format('D.MM') }
    })
    const withValue = series.filter(e => e.value > 0)
    const eventAvg = withValue.length ? Math.round((withValue.reduce((a, e) => a + e.value, 0) / withValue.length) * 10) / 10 : null
    return { eventBars, eventAvg }
  }, [metric, stats, events, now, slot, barW])
  const eventUnit = metricDef
    ? metricDef.amountUnit && metricDef.amountAgg === 'sum'
      ? metricDef.amountUnit
      : metricDef.kind === 'interval'
        ? 'мин'
        : 'раз'
    : ''

  const avg = useMemo(() => {
    const withData = stats.filter(d => d.totalSleepMin > 0)
    if (!withData.length) return null
    return {
      total: withData.reduce((a, d) => a + d.totalSleepMin, 0) / withData.length,
      day: withData.reduce((a, d) => a + d.daySleepMin, 0) / withData.length,
      naps: Math.round((withData.reduce((a, d) => a + d.napCount, 0) / withData.length) * 10) / 10,
      daysCounted: withData.length
    }
  }, [stats])

  let avgVerdict = ''
  if (avg && norms) {
    const [min, max] = norms.totalSleep
    if (avg.total < min - 30)
      avgVerdict = 'Суммарного сна в среднем меньше возрастной нормы — присмотритесь к подсказкам на главном экране.'
    else if (avg.total > max + 30)
      avgVerdict = 'Сна в среднем больше нормы — если малыш бодр и весел, для младенцев это обычно не проблема.'
    else avgVerdict = 'Суммарный сон в пределах возрастной нормы — отличная работа!'
  }

  return (
    <View>
      {/* ── Статистика ── */}
      {!showStats ? (
        <Btn
          title="📊 Статистика"
          block
          onPress={() => {
            animateLayout()
            setShowStats(true)
          }}
          style={{ marginBottom: 12 }}
        />
      ) : (
        <>
          <Text style={[s.cardTitle, { marginBottom: 2 }]}>Статистика</Text>
          <Text style={[s.muted, s.small, { marginBottom: 10 }]}>По дням и средние за период (текущий день не учитывается).</Text>

          {usedEventTypes.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <SelectInput
                value={metric}
                options={[
                  { id: 'sleep', label: 'Сон', icon: '😴' },
                  ...usedEventTypes.map(t => ({ id: t.id, label: t.btnLabel || t.label, icon: t.icon }))
                ]}
                onChange={setMetric}
                title="Показатель"
              />
            </View>
          )}

          <View style={[s.row, { marginBottom: 12 }]}>
            <Pressable onPress={() => setDays(7)} style={[s.chip, days === 7 && s.chipActive]}>
              <Text style={[s.chipText, days === 7 && s.chipActiveText]}>7 дней</Text>
            </Pressable>
            <Pressable onPress={() => setDays(14)} style={[s.chip, days === 14 && s.chipActive]}>
              <Text style={[s.chipText, days === 14 && s.chipActiveText]}>14 дней</Text>
            </Pressable>
            <Pressable onPress={() => setDays(30)} style={[s.chip, days === 30 && s.chipActive]}>
              <Text style={[s.chipText, days === 30 && s.chipActiveText]}>Месяц</Text>
            </Pressable>
          </View>

          {metric !== 'sleep' ? (
            <Card>
              <Text style={s.cardTitle}>
                {metricDef?.label} по дням, {eventUnit}
              </Text>
              <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
                <Line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + chartH} y2={PAD.top + chartH} stroke={colors.border} strokeWidth={1} />
                {eventBars.map((b, i) => (
                  <React.Fragment key={i}>
                    <Rect x={b.x} y={b.y} width={barW} height={Math.max(0, b.hpx)} rx={3} fill={colors.primary} />
                    {(days === 7 || i % 2 === 0) && (
                      <SvgText x={b.x + barW / 2} y={H - 8} fontSize={9} fill={colors.textSoft} textAnchor="middle">
                        {b.label}
                      </SvgText>
                    )}
                  </React.Fragment>
                ))}
              </Svg>
              <Text style={[s.muted, s.small, { textAlign: 'center', marginTop: 6 }]}>
                {eventAvg != null ? `В среднем ${eventAvg} ${eventUnit}/день` : 'Нет отметок за период.'}
              </Text>
            </Card>
          ) : (
            <Card>
              <Text style={s.cardTitle}>Сон по дням, часы</Text>
              <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
                {gridLines.map(line => (
                  <React.Fragment key={line.h}>
                    <Line x1={PAD.left} x2={W - PAD.right} y1={line.y} y2={line.y} stroke={colors.border} strokeWidth={1} />
                    <SvgText x={PAD.left - 5} y={line.y + 3} fontSize={9} fill={colors.textSoft} textAnchor="end">
                      {String(line.h)}
                    </SvgText>
                  </React.Fragment>
                ))}
                {norms && (
                  <>
                    <Line
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={y(norms.totalSleep[0] / 60)}
                      y2={y(norms.totalSleep[0] / 60)}
                      stroke={colors.warn}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      opacity={0.8}
                    />
                    <Line
                      x1={PAD.left}
                      x2={W - PAD.right}
                      y1={y(norms.totalSleep[1] / 60)}
                      y2={y(norms.totalSleep[1] / 60)}
                      stroke={colors.warn}
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      opacity={0.8}
                    />
                  </>
                )}
                {bars.map((b, i) => (
                  <React.Fragment key={i}>
                    <Rect x={b.x} y={b.nightY} width={barW} height={Math.max(0, b.nightHpx)} rx={3} fill={colors.nightBar} />
                    <Rect x={b.x} y={b.dayY} width={barW} height={Math.max(0, b.dayHpx)} rx={3} fill={colors.dayBar} />
                    {(days === 7 || i % 2 === 0) && (
                      <SvgText x={b.x + barW / 2} y={H - 8} fontSize={9} fill={colors.textSoft} textAnchor="middle">
                        {b.label}
                      </SvgText>
                    )}
                  </React.Fragment>
                ))}
              </Svg>
              <View style={styles.legend}>
                <Legend color={colors.nightBar} label="ночь" textColor={colors.textSoft} />
                <Legend color={colors.dayBar} label="день" textColor={colors.textSoft} />
                <Legend color={colors.warn} label="норма" textColor={colors.textSoft} dashed />
              </View>
            </Card>
          )}

          {metric === 'sleep' &&
            (avg ? (
              <Card>
                <Text style={s.cardTitle}>В среднем за {avg.daysCounted} дн. с данными</Text>
                <KeyValueRow label="Всего сна в сутки" value={formatDurationMin(avg.total)} mutedLabel={false} />
                <KeyValueRow label="Дневной сон" value={formatDurationMin(avg.day)} mutedLabel={false} />
                <KeyValueRow label="Дневных снов" value={String(avg.naps)} mutedLabel={false} />
                {norms && (
                  <KeyValueRow
                    label="Норма всего"
                    value={`${formatDurationMin(norms.totalSleep[0])} – ${formatDurationMin(norms.totalSleep[1])}`}
                    mutedLabel={false}
                  />
                )}
                <Text style={[s.muted, s.small, { marginTop: 8 }]}>{avgVerdict}</Text>
              </Card>
            ) : (
              <Text style={[s.muted, s.small, { textAlign: 'center' }]}>
                Пока нет данных — отмечайте сон на главном экране, и здесь появится картина недели.
              </Text>
            ))}
        </>
      )}

      {/* ── Распорядок дня ── */}
      <SchedulePlanner days={days} />
    </View>
  )
}

function Legend({ color, label, textColor, dashed }: { color: string; label: string; textColor: string; dashed?: boolean }) {
  return (
    <View style={styles.legItem}>
      <View style={[dashed ? styles.legLine : styles.legDot, dashed ? { borderColor: color } : { backgroundColor: color }]} />
      <Text style={{ fontSize: 12, color: textColor }}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 6 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 10, height: 10, borderRadius: 3 },
  legLine: { width: 16, borderTopWidth: 2, borderStyle: 'dashed' }
})
