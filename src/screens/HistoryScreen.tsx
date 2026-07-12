import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useSorted } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow, simNow } from '../time/now'
import { analyzeDay } from '../logic/sleepAnalyzer'
import { formatDurationMin, plural } from '../logic/age'
import { dayCount, dayTotalMin } from '../logic/eventStats'
import { poopVerb } from '../logic/gender'
import { NON_SLEEP_TYPE_LIST, typeDef, eventKind } from '../data/eventTypes'
import { animateLayout } from '../utils/animation'
import TimelineDay from '../components/TimelineDay'
import EventEditSheet, { EventModel } from '../components/EventEditSheet'
import StatsSection from '../components/StatsSection'
import { Card, Btn, KeyValueRow } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function HistoryScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const events = useSorted()
  const child = useActiveChild()
  const now = useNow()

  const [dayOffset, setDayOffset] = useState(0)
  const [sheetModel, setSheetModel] = useState<EventModel>(null)
  const [showMore, setShowMore] = useState(false)

  const dayTs = dayjs(now).startOf('day').add(dayOffset, 'day').valueOf()
  const dayLabel = dayOffset === 0 ? 'Сегодня' : dayOffset === -1 ? 'Вчера' : dayjs(dayTs).format('D MMMM, dd')

  const summary = useMemo(() => analyzeDay(events, dayTs, now), [events, dayTs, now])
  const poopWord = poopVerb(child?.gender)

  // Строки по типам событий, реально отмеченным в этот день (кроме сна).
  const otherStats = useMemo(() => {
    return NON_SLEEP_TYPE_LIST.map(t => {
      const evs = events.filter(e => e.type === t.id && !e.planned && dayjs(e.startedAt).isSame(dayjs(dayTs), 'day'))
      if (!evs.length) return null
      const label = t.id === 'poop' ? poopWord : t.btnLabel || t.label
      let value: string
      if (t.amountUnit && t.amountAgg === 'sum') {
        value = `${evs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)} ${t.amountUnit}`
      } else if (t.amountUnit && t.amountAgg === 'last') {
        const withAmt = evs.filter(e => e.amount != null)
        value = withAmt.length
          ? `${withAmt[withAmt.length - 1].amount} ${t.amountUnit}`
          : `${evs.length} ${plural(evs.length, 'раз', 'раза', 'раз')}`
      } else if (evs.some(e => eventKind(e) === 'interval')) {
        value = formatDurationMin(dayTotalMin(events, t.id, dayTs, now))
      } else {
        const n = dayCount(events, t.id, dayTs)
        value = `${n} ${plural(n, 'раз', 'раза', 'раз')}`
      }
      return { id: t.id, label: `${typeDef(t.id).icon} ${label}`, value }
    }).filter(Boolean) as { id: string; label: string; value: string }[]
  }, [events, dayTs, now, poopWord])

  function addEvent() {
    const base = dayOffset === 0 ? simNow() : dayjs(dayTs).add(12, 'hour').valueOf()
    setSheetModel({ isNew: true, type: 'sleep', startedAt: base })
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.dayNav}>
          <Pressable
            onPress={() => setDayOffset(d => d - 1)}
            style={[styles.arrow, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Предыдущий день"
          >
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
            accessibilityRole="button"
            accessibilityLabel="Следующий день"
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <Card>
          <Text style={[s.cardTitle, { marginBottom: 8 }]}>Сводка за день</Text>
          <KeyValueRow label="Среднее бодрствование" value={summary.wakeWindowMin > 0 ? formatDurationMin(summary.wakeWindowMin) : '—'} />
          <KeyValueRow
            label="Дневной сон"
            value={`${formatDurationMin(summary.daySleepMin)} · ${summary.napCount} ${plural(summary.napCount, 'сон', 'сна', 'снов')}`}
          />
          <KeyValueRow label="Ночной сон" value={formatDurationMin(summary.nightSleepMin)} />
          <KeyValueRow label="Всего сна" value={formatDurationMin(summary.totalSleepMin)} />
          {showMore && otherStats.map(r => <KeyValueRow key={r.id} label={r.label} value={r.value} />)}
          {otherStats.length > 0 && (
            <Pressable
              onPress={() => {
                animateLayout()
                setShowMore(v => !v)
              }}
              style={[styles.moreBtn, { borderTopColor: colors.border }]}
            >
              <Ionicons name={showMore ? 'chevron-down' : 'chevron-forward'} size={16} color={colors.textSoft} />
              <Text style={{ color: colors.textSoft, fontSize: 13, fontWeight: '600' }}>
                {showMore ? 'Свернуть' : `Ещё ${otherStats.length} ${plural(otherStats.length, 'событие', 'события', 'событий')}`}
              </Text>
            </Pressable>
          )}
        </Card>

        <StatsSection />

        <Card>
          <Text style={[s.cardTitle, { marginBottom: 10 }]}>История событий</Text>
          <Btn title="+ Добавить событие" variant="secondary" block onPress={addEvent} style={{ marginBottom: 12 }} />
          <TimelineDay dayTs={dayTs} onEdit={e => setSheetModel(e)} />
        </Card>
      </ScrollView>

      <EventEditSheet model={sheetModel} onClose={() => setSheetModel(null)} />
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
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1 }
})
