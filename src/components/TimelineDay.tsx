import React, { useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useSorted, SleepEvent } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow } from '../time/now'
import { typeDef } from '../data/eventTypes'
import { formatDurationMin, plural } from '../logic/age'
import { poopVerb } from '../logic/gender'
import { analyzeDay } from '../logic/sleepAnalyzer'
import { useTheme } from '../theme/ThemeProvider'
import { eventColors } from '../theme/eventColor'

export default function TimelineDay({ dayTs, onEdit }: { dayTs: number; onEdit: (e: SleepEvent) => void }) {
  const { colors } = useTheme()
  const child = useActiveChild()
  const now = useNow()
  const events = useSorted()

  const typeOf = (e: SleepEvent) => typeDef(e.type)

  const softColor = (e: SleepEvent) => eventColors(colors, e.type).soft

  // Хронологический порядок: раннее сверху, позднее снизу
  const dayEvents = useMemo(() => {
    const from = dayjs(dayTs).startOf('day').valueOf()
    const to = dayjs(dayTs).endOf('day').valueOf()
    return events.filter(e => {
      const end = e.endedAt ?? (typeDef(e.type).kind === 'interval' ? now : e.startedAt)
      return e.startedAt <= to && end >= from
    })
  }, [events, dayTs, now])

  // Порядковые номера ТОЛЬКО дневных снов (nap) — для подписи «Сон N».
  const napNo: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {}
    analyzeDay(events, dayTs, now).naps.forEach((s: SleepEvent, i: number) => {
      map[s.id] = i + 1
    })
    return map
  }, [events, dayTs, now])

  function labelOf(e: SleepEvent) {
    if (e.type === 'poop') return poopVerb(child?.gender)
    if (e.type === 'sleep' && napNo[e.id]) return `Сон ${napNo[e.id]}`
    return typeOf(e).label
  }

  function amountLabel(e: SleepEvent) {
    const unit = typeOf(e).amountUnit
    return unit != null && e.amount != null ? `${e.amount} ${unit}` : ''
  }

  function teethLabel(e: SleepEvent) {
    if (e.type === 'teeth' && Array.isArray(e.teeth) && e.teeth.length) {
      const n = e.teeth.length
      return `🦷 ${n} ${plural(n, 'зуб', 'зуба', 'зубов')}`
    }
    return ''
  }

  function timeLabel(e: SleepEvent) {
    const start = dayjs(e.startedAt).format('HH:mm')
    if (typeOf(e).kind !== 'interval') return start
    if (e.endedAt == null) return `${start} → сейчас`
    return `${start} – ${dayjs(e.endedAt).format('HH:mm')}`
  }

  function durLabel(e: SleepEvent) {
    if (typeOf(e).kind !== 'interval') return ''
    const end = e.endedAt ?? now
    return formatDurationMin((end - e.startedAt) / 60000)
  }

  if (dayEvents.length === 0) {
    return <Text style={[styles.empty, { color: colors.textSoft }]}>Событий пока нет</Text>
  }

  return (
    <View>
      {dayEvents.map((e, i) => {
        const ongoing = e.endedAt == null && typeOf(e).kind === 'interval'
        const dur = durLabel(e)
        return (
          <Pressable
            key={e.id}
            onPress={() => onEdit(e)}
            style={[styles.item, { borderBottomColor: colors.border }, i === dayEvents.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={[styles.icon, { backgroundColor: softColor(e) }]}>
              <Text style={{ fontSize: 19 }}>{typeOf(e).icon}</Text>
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: colors.text }]}>{labelOf(e)}</Text>
                {ongoing && <Text style={[styles.ongoing, { color: colors.walk, backgroundColor: colors.walkSoft }]}>идёт</Text>}
              </View>
              <Text style={[styles.time, { color: colors.textSoft }]}>
                {timeLabel(e)}
                {dur ? ` · ${dur}` : ''}
                {amountLabel(e) ? ` · ${amountLabel(e)}` : ''}
                {teethLabel(e) ? ` · ${teethLabel(e)}` : ''}
              </Text>
              {e.note ? <Text style={[styles.time, { color: colors.textSoft }]}>{e.note}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, paddingVertical: 8, paddingHorizontal: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    minHeight: 56
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontWeight: '600', fontSize: 14.5 },
  ongoing: { fontSize: 11, fontWeight: '700', paddingVertical: 1, paddingHorizontal: 8, borderRadius: 999, overflow: 'hidden' },
  time: { fontSize: 13 }
})
