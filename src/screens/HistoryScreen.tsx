import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useSorted } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow, simNow } from '../time/now'
import { analyzeDay } from '../logic/sleepAnalyzer'
import { formatDurationMin, plural } from '../logic/age'
import { dayCount, dayTotalMin } from '../logic/eventStats'
import { poopVerb } from '../logic/gender'
import TimelineDay from '../components/TimelineDay'
import EventEditSheet, { EventModel } from '../components/EventEditSheet'
import { Card, Btn } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function HistoryScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const events = useSorted()
  const child = useActiveChild()
  const now = useNow()

  const [dayOffset, setDayOffset] = useState(0)
  const [sheetModel, setSheetModel] = useState<EventModel>(null)

  const dayTs = dayjs(now).startOf('day').add(dayOffset, 'day').valueOf()
  const dayLabel = dayOffset === 0 ? 'Сегодня' : dayOffset === -1 ? 'Вчера' : dayjs(dayTs).format('D MMMM, dd')

  const summary = analyzeDay(events, dayTs, now)
  const tummyMin = dayTotalMin(events, 'tummy', dayTs, now)
  const poopCount = dayCount(events, 'poop', dayTs)
  const poopWord = poopVerb(child?.gender)

  function addEvent() {
    const base = dayOffset === 0 ? simNow() : dayjs(dayTs).add(12, 'hour').valueOf()
    setSheetModel({ isNew: true, type: 'sleep', startedAt: base })
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.dayNav}>
          <Pressable onPress={() => setDayOffset(d => d - 1)} style={[styles.arrow, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <View style={styles.dayLabel}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>{dayLabel}</Text>
            <Text style={[s.muted, s.small]}>{dayjs(dayTs).format('D MMMM YYYY')}</Text>
          </View>
          <Pressable
            disabled={dayOffset >= 0}
            onPress={() => setDayOffset(d => d + 1)}
            style={[styles.arrow, { backgroundColor: colors.surface }, dayOffset >= 0 && { opacity: 0.35 }]}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Card>
          <Report label="Всего сна" value={formatDurationMin(summary.totalSleepMin)} colors={colors} />
          <Report label="Ночной сон" value={formatDurationMin(summary.nightSleepMin)} colors={colors} />
          <Report
            label="Дневной сон"
            value={`${formatDurationMin(summary.daySleepMin)} · ${summary.napCount} ${plural(summary.napCount, 'сон', 'сна', 'снов')}`}
            colors={colors}
          />
          <Report label="👶 На животе" value={tummyMin > 0 ? formatDurationMin(tummyMin) : '—'} colors={colors} />
          <Report label={`💩 ${poopWord}`} value={`${poopCount} ${plural(poopCount, 'раз', 'раза', 'раз')}`} colors={colors} />
          <Btn
            title="🗓️ Построить расписание на завтра"
            variant="secondary"
            block
            onPress={() => navigation.navigate('stats', { schedule: true })}
            style={{ marginTop: 12 }}
          />
        </Card>

        <Card>
          <TimelineDay dayTs={dayTs} onEdit={e => setSheetModel(e)} />
          <Btn title="+ Добавить событие" variant="secondary" block onPress={addEvent} style={{ marginTop: 10 }} />
        </Card>
      </ScrollView>

      <EventEditSheet model={sheetModel} onClose={() => setSheetModel(null)} />
    </View>
  )
}

function Report({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.repRow}>
      <Text style={{ color: colors.textSoft, fontSize: 14 }}>{label}</Text>
      <Text style={{ fontWeight: '700', color: colors.text, fontSize: 14 }}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingBottom: 12 },
  dayLabel: { flex: 1, alignItems: 'center' },
  dayTitle: { fontSize: 19, fontWeight: '700' },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  repRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 3.5 }
})
