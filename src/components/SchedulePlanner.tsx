import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import dayjs from 'dayjs'
import { useSorted } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow } from '../time/now'
import { formatDurationMin, plural } from '../logic/age'
import { CALENDAR_TYPE_IDS, typeDef } from '../data/eventTypes'
import { scheduleProfile, buildSchedule } from '../logic/schedule'
import { animateLayout } from '../utils/animation'
import { Card, Btn } from './ui'
import DateTimeInput from './DateTimeInput'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

const TIME_TICKS = [0, 6, 12, 18, 24]

function minutesToDate(min: number) {
  return dayjs().startOf('day').add(min, 'minute').toDate()
}

// Построитель распорядка дня: свёрнутая кнопка → карточка с таймлайном и шагами.
// days — период усреднения истории (общий с выбором периода в статистике).
export default function SchedulePlanner({ days }: { days: number }) {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const events = useSorted()
  const child = useActiveChild()
  const now = useNow()

  const [show, setShow] = useState(false)
  const [wakeMin, setWakeMin] = useState<number | null>(null)
  const [bedMin, setBedMin] = useState<number | null>(null)
  // День, на который строим распорядок (по умолчанию — завтра)
  const [schedDate, setSchedDate] = useState<Date>(() => dayjs(now).add(1, 'day').startOf('day').toDate())

  // Запланированные события выбранного дня → «якоря» бодрствования для расписания
  const anchors = useMemo(() => {
    const aStart = dayjs(schedDate).startOf('day')
    const aEnd = aStart.add(1, 'day')
    return events
      .filter(e => e.planned && CALENDAR_TYPE_IDS.includes(e.type) && e.startedAt >= aStart.valueOf() && e.startedAt < aEnd.valueOf())
      .map(e => ({ min: dayjs(e.startedAt).diff(aStart, 'minute'), label: typeDef(e.type).label, icon: typeDef(e.type).icon || '📌' }))
  }, [events, schedDate])

  // Профиль и расписание считаем только в развёрнутом состоянии.
  const profile = useMemo(() => (show && child ? scheduleProfile(events, now, days, child) : null), [show, child, events, now, days])
  const schedule = useMemo(
    () => (profile ? buildSchedule(profile, { wakeMin, bedMin, anchors }) : null),
    [profile, wakeMin, bedMin, anchors]
  )

  const schedRows: any[] = useMemo(() => {
    if (!schedule) return []
    const rows: any[] = [{ kind: 'wake', hhmm: schedule.wake.hhmm }]
    const stops = [
      ...schedule.naps.map(n => ({ at: n.startMin, kind: 'nap' as const, nap: n })),
      ...schedule.anchors.map(a => ({ at: a.min, kind: 'event' as const, ev: a }))
    ].sort((x, z) => x.at - z.at)
    let prevEnd = schedule.wake.min
    let napIdx = 0
    for (const st of stops) {
      if (st.kind === 'nap') {
        rows.push({ kind: 'gap', min: st.nap.startMin - prevEnd })
        rows.push({ kind: 'nap', idx: ++napIdx, nap: st.nap })
        prevEnd = st.nap.endMin
      } else {
        rows.push({ kind: 'event', ev: st.ev })
      }
    }
    rows.push({ kind: 'gap', min: schedule.bedtime.min - prevEnd })
    rows.push({ kind: 'bed', hhmm: schedule.bedtime.hhmm })
    return rows
  }, [schedule])

  function open() {
    const prof = child ? scheduleProfile(events, now, days, child) : null
    if (prof) {
      if (wakeMin == null) setWakeMin(prof.wakeMin)
      if (bedMin == null) setBedMin(prof.bedMin)
    }
    animateLayout()
    setShow(true)
  }

  if (!show || !schedule) {
    return <Btn title="🗓️ Построить распорядок дня" block onPress={open} style={{ marginBottom: 12 }} />
  }

  return (
    <Card>
      <Text style={s.cardTitle}>Распорядок дня</Text>
      <Text style={[s.muted, s.small, { marginBottom: 12 }]}>
        {schedule.source === 'history'
          ? `На основе средних за ${schedule.daysCounted} ${plural(schedule.daysCounted, 'день', 'дня', 'дней')} с данными`
          : 'По возрастным нормам — данных о сне пока мало'}
      </Text>

      <View style={{ marginBottom: 14 }}>
        <Text style={s.label}>День (учитываются события из календаря на эту дату)</Text>
        <DateTimeInput value={schedDate} mode="date" onChange={setSchedDate} />
      </View>

      <View style={styles.bounds}>
        <View style={s.grow}>
          <Text style={s.label}>Начало дня</Text>
          <DateTimeInput
            value={minutesToDate(wakeMin ?? 0)}
            mode="time"
            onChange={d => setWakeMin(dayjs(d).hour() * 60 + dayjs(d).minute())}
          />
        </View>
        <View style={s.grow}>
          <Text style={s.label}>Конец дня</Text>
          <DateTimeInput
            value={minutesToDate(bedMin ?? 0)}
            mode="time"
            onChange={d => setBedMin(dayjs(d).hour() * 60 + dayjs(d).minute())}
          />
        </View>
      </View>

      <View style={styles.tlWrap}>
        <View style={[styles.tlBar, { backgroundColor: colors.surface2 }]}>
          {schedule.segments.map((seg, i) => (
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
          {TIME_TICKS.map(t => (
            <Text key={t} style={[styles.tick, { color: colors.textSoft, left: `${(t / 24) * 100}%` }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>

      <View>
        {schedRows.map((r: any, i: number) => {
          if (r.kind === 'wake') return <SchedRow key={i} icon="☀️" label="Подъём" time={r.hhmm} />
          if (r.kind === 'gap')
            return (
              <Text key={i} style={[s.muted, s.small, styles.gap]}>
                бодрствование ~{formatDurationMin(r.min)}
              </Text>
            )
          if (r.kind === 'nap')
            return (
              <SchedRow
                key={i}
                icon="😴"
                label={`Сон ${r.idx} · ${formatDurationMin(r.nap.durMin)}`}
                time={`${r.nap.startHHMM}–${r.nap.endHHMM}`}
              />
            )
          if (r.kind === 'event')
            return <SchedRow key={i} icon={r.ev.icon} label={`${r.ev.label} · бодрствование`} time={r.ev.hhmm} event />
          return <SchedRow key={i} icon="🌙" label="Ночной сон" time={r.hhmm} night />
        })}
      </View>

      {schedule.adjusted && (
        <Text style={[s.muted, s.small, { marginTop: 10 }]}>
          🎯 Распорядок подстроен под события из календаря — к их времени малыш бодрствует.
        </Text>
      )}
      <Text style={[s.muted, s.small, { marginTop: 10 }]}>
        Окна бодрствования короче с утра и длиннее к вечеру. Ориентир по средним, а не жёсткое правило.
      </Text>
    </Card>
  )
}

function SchedRow({ icon, label, time, night, event }: { icon: string; label: string; time: string; night?: boolean; event?: boolean }) {
  const { colors } = useTheme()
  const bg = event ? colors.warnSoft : night ? colors.primarySoft : colors.surface2
  return (
    <View style={[styles.schedRow, { backgroundColor: bg }, event && { borderWidth: 1, borderColor: colors.warn }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[styles.schedLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.schedTime, { color: colors.text }]}>{time}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bounds: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  tlWrap: { marginBottom: 14 },
  tlBar: { position: 'relative', height: 22, borderRadius: 6, overflow: 'hidden' },
  tlTicks: { position: 'relative', height: 14, marginTop: 2 },
  tick: { position: 'absolute', fontSize: 9, transform: [{ translateX: -4 }] },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2
  },
  schedLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  schedTime: { fontSize: 14, fontWeight: '700' },
  gap: { paddingVertical: 3, paddingLeft: 40 }
})
