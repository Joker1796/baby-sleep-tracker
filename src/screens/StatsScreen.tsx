import React, { useEffect, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg'
import dayjs from 'dayjs'
import { useSorted } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow } from '../time/now'
import { analyzeDay } from '../logic/sleepAnalyzer'
import { ageInMonths, formatDurationMin, plural } from '../logic/age'
import { getNorms } from '../data/sleepNorms'
import { scheduleProfile, buildSchedule, minToHHMM, hhmmToMin } from '../logic/schedule'
import { Card, Btn } from '../components/ui'
import DateTimeInput from '../components/DateTimeInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

const W = 340
const H = 190
const PAD = { top: 8, right: 6, bottom: 22, left: 26 }
const MAX_H = 20
const chartW = W - PAD.left - PAD.right
const chartH = H - PAD.top - PAD.bottom

function y(hours: number) {
  return PAD.top + chartH - (Math.min(hours, MAX_H) / MAX_H) * chartH
}

function minutesToDate(min: number) {
  return dayjs().startOf('day').add(min, 'minute').toDate()
}

export default function StatsScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const route = useRoute<any>()
  const events = useSorted()
  const child = useActiveChild()
  const now = useNow()

  const [days, setDays] = useState(7)
  const [showSchedule, setShowSchedule] = useState(false)
  const [wakeMin, setWakeMin] = useState<number | null>(null)
  const [bedMin, setBedMin] = useState<number | null>(null)

  const stats: any[] = []
  for (let i = days - 1; i >= 0; i--) {
    const dayTs = dayjs(now).startOf('day').subtract(i, 'day').valueOf()
    stats.push({ dayTs, ...analyzeDay(events, dayTs, now) })
  }

  const norms = child ? getNorms(ageInMonths(child.birthDate, now)) : null

  const slot = chartW / stats.length
  const barW = Math.min(slot * 0.62, 30)
  const bars = stats.map((d, i) => {
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
  })
  const gridLines = [4, 8, 12, 16, 20].map(h => ({ h, y: y(h) }))

  const withData = stats.filter(d => d.totalSleepMin > 0)
  const avg = withData.length
    ? {
        total: withData.reduce((a, d) => a + d.totalSleepMin, 0) / withData.length,
        day: withData.reduce((a, d) => a + d.daySleepMin, 0) / withData.length,
        naps: Math.round((withData.reduce((a, d) => a + d.napCount, 0) / withData.length) * 10) / 10,
        daysCounted: withData.length
      }
    : null

  let avgVerdict = ''
  if (avg && norms) {
    const [min, max] = norms.totalSleep
    if (avg.total < min - 30) avgVerdict = 'Суммарного сна в среднем меньше возрастной нормы — присмотритесь к подсказкам на главном экране.'
    else if (avg.total > max + 30) avgVerdict = 'Сна в среднем больше нормы — если малыш бодр и весел, для младенцев это обычно не проблема.'
    else avgVerdict = 'Суммарный сон в пределах возрастной нормы — отличная работа!'
  }

  const profile = child ? scheduleProfile(events, now, days, child) : null
  const schedule = profile ? buildSchedule(profile, { wakeMin, bedMin }) : null

  function openSchedule() {
    if (profile) {
      if (wakeMin == null) setWakeMin(profile.wakeMin)
      if (bedMin == null) setBedMin(profile.bedMin)
    }
    setShowSchedule(true)
  }

  useEffect(() => {
    if (route.params?.schedule) openSchedule()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.schedule])

  const timeTicks = [0, 6, 12, 18, 24]

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[s.row, { marginBottom: 12 }]}>
          <Pressable onPress={() => setDays(7)} style={[s.chip, days === 7 && s.chipActive]}>
            <Text style={[s.chipText, days === 7 && s.chipActiveText]}>7 дней</Text>
          </Pressable>
          <Pressable onPress={() => setDays(14)} style={[s.chip, days === 14 && s.chipActive]}>
            <Text style={[s.chipText, days === 14 && s.chipActiveText]}>14 дней</Text>
          </Pressable>
        </View>

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
                <Line x1={PAD.left} x2={W - PAD.right} y1={y(norms.totalSleep[0] / 60)} y2={y(norms.totalSleep[0] / 60)} stroke={colors.warn} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
                <Line x1={PAD.left} x2={W - PAD.right} y1={y(norms.totalSleep[1] / 60)} y2={y(norms.totalSleep[1] / 60)} stroke={colors.warn} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
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

        {avg ? (
          <Card>
            <Text style={s.cardTitle}>В среднем за {avg.daysCounted} дн. с данными</Text>
            <AvgRow label="Всего сна в сутки" value={formatDurationMin(avg.total)} colors={colors} />
            <AvgRow label="Дневной сон" value={formatDurationMin(avg.day)} colors={colors} />
            <AvgRow label="Дневных снов" value={String(avg.naps)} colors={colors} />
            {norms && (
              <AvgRow label="Норма всего" value={`${formatDurationMin(norms.totalSleep[0])} – ${formatDurationMin(norms.totalSleep[1])}`} colors={colors} />
            )}
            <Text style={[s.muted, s.small, { marginTop: 8 }]}>{avgVerdict}</Text>
          </Card>
        ) : (
          <Text style={[s.muted, s.small, { textAlign: 'center' }]}>
            Пока нет данных — отмечайте сон на главном экране, и здесь появится картина недели.
          </Text>
        )}

        {!showSchedule ? (
          <Btn title="🗓️ Построить расписание на завтра" block onPress={openSchedule} style={{ marginBottom: 12 }} />
        ) : (
          schedule && (
            <Card>
              <Text style={s.cardTitle}>Примерный распорядок на завтра</Text>
              <Text style={[s.muted, s.small, { marginBottom: 12 }]}>
                {schedule.source === 'history'
                  ? `На основе средних за ${schedule.daysCounted} ${plural(schedule.daysCounted, 'день', 'дня', 'дней')} с данными`
                  : 'По возрастным нормам — данных о сне пока мало'}
              </Text>

              <View style={styles.bounds}>
                <View style={s.grow}>
                  <Text style={s.label}>Начало дня</Text>
                  <DateTimeInput value={minutesToDate(wakeMin ?? 0)} mode="time" onChange={d => setWakeMin(dayjs(d).hour() * 60 + dayjs(d).minute())} />
                </View>
                <View style={s.grow}>
                  <Text style={s.label}>Конец дня</Text>
                  <DateTimeInput value={minutesToDate(bedMin ?? 0)} mode="time" onChange={d => setBedMin(dayjs(d).hour() * 60 + dayjs(d).minute())} />
                </View>
              </View>

              {/* 24-часовая полоса */}
              <View style={styles.tlWrap}>
                <View style={[styles.tlBar, { backgroundColor: colors.surface2 }]}>
                  {schedule.segments.map((seg: any, i: number) => (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${(seg.from / 1440) * 100}%`,
                        width: `${((seg.to - seg.from) / 1440) * 100}%`,
                        backgroundColor: seg.type === 'night' ? colors.nightBar : colors.dayBar
                      }}
                    />
                  ))}
                </View>
                <View style={styles.tlTicks}>
                  {timeTicks.map(t => (
                    <Text key={t} style={[styles.tick, { color: colors.textSoft, left: `${(t / 24) * 100}%` }]}>
                      {t}
                    </Text>
                  ))}
                </View>
              </View>

              <View>
                <SchedRow icon="☀️" label="Подъём" time={schedule.wake.hhmm} colors={colors} />
                {schedule.naps.map((nap: any, i: number) => (
                  <React.Fragment key={i}>
                    <Text style={[s.muted, s.small, styles.gap]}>бодрствование ~{formatDurationMin(schedule.wakeWindowMin)}</Text>
                    <SchedRow icon="😴" label={`Сон ${i + 1} · ${formatDurationMin(nap.durMin)}`} time={`${nap.startHHMM}–${nap.endHHMM}`} colors={colors} />
                  </React.Fragment>
                ))}
                <Text style={[s.muted, s.small, styles.gap]}>бодрствование ~{formatDurationMin(schedule.wakeWindowMin)}</Text>
                <SchedRow icon="🌙" label="Ночной сон" time={schedule.bedtime.hhmm} colors={colors} night />
              </View>

              <Text style={[s.muted, s.small, { marginTop: 10 }]}>
                Ориентир по средним, а не жёсткое правило — подстраивайте под признаки усталости малыша.
              </Text>
            </Card>
          )
        )}
      </ScrollView>
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

function AvgRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.avgRow}>
      <Text style={{ color: colors.text, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  )
}

function SchedRow({ icon, label, time, colors, night }: { icon: string; label: string; time: string; colors: any; night?: boolean }) {
  return (
    <View style={[styles.schedRow, { backgroundColor: night ? colors.primarySoft : colors.surface2 }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[s2.schedLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[s2.schedTime, { color: colors.text }]}>{time}</Text>
    </View>
  )
}

const s2 = StyleSheet.create({
  schedLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  schedTime: { fontSize: 14, fontWeight: '700' }
})

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 6 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legDot: { width: 10, height: 10, borderRadius: 3 },
  legLine: { width: 16, borderTopWidth: 2, borderStyle: 'dashed' },
  avgRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  bounds: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tlWrap: { marginBottom: 14 },
  tlBar: { position: 'relative', height: 22, borderRadius: 6, overflow: 'hidden' },
  tlTicks: { position: 'relative', height: 14, marginTop: 2 },
  tick: { position: 'absolute', fontSize: 9, transform: [{ translateX: -4 }] },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  gap: { paddingVertical: 3, paddingLeft: 40 }
})
