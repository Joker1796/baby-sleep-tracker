import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import dayjs, { Dayjs } from 'dayjs'
import { useSorted, SleepEvent } from '../store/events'
import { useNow, simNow } from '../time/now'
import { typeDef, CALENDAR_TYPE_IDS, CALENDAR_TYPE_LIST } from '../data/eventTypes'
import { animateLayout } from '../utils/animation'
import EventEditSheet, { EventModel } from '../components/EventEditSheet'
import { Card } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'
import { radiusSm } from '../theme/colors'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function CalendarScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const now = useNow()
  const events = useSorted()

  const [month, setMonth] = useState<Dayjs>(dayjs(now).startOf('month'))
  const [selectedDay, setSelectedDay] = useState<Dayjs | null>(dayjs(now).startOf('day'))
  const [sheetModel, setSheetModel] = useState<EventModel>(null)
  const [showPalette, setShowPalette] = useState(false)

  const calEvents = useMemo(
    () => events.filter(e => CALENDAR_TYPE_IDS.includes(e.type)),
    [events]
  )

  // Число месяца → события этого дня (в текущем месяце)
  const byDay = useMemo(() => {
    const map: Record<number, SleepEvent[]> = {}
    for (const e of calEvents) {
      const d = dayjs(e.startedAt)
      if (d.isSame(month, 'month')) (map[d.date()] ??= []).push(e)
    }
    return map
  }, [calEvents, month])

  const cells = useMemo(() => {
    const lead = (month.startOf('month').day() + 6) % 7
    const arr: (number | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= month.daysInMonth(); d++) arr.push(d)
    return arr
  }, [month])

  const dayDone = (day: number) => (byDay[day] || []).some(e => !e.planned)
  const dayPlanned = (day: number) => (byDay[day] || []).some(e => e.planned)
  const isSelected = (day: number) => !!selectedDay && selectedDay.isSame(month.date(day), 'day')

  const selectedEvents = useMemo(() => {
    if (!selectedDay || !selectedDay.isSame(month, 'month')) return []
    return [...(byDay[selectedDay.date()] || [])].sort((a, b) => a.startedAt - b.startedAt)
  }, [selectedDay, byDay, month])

  function dayBase() {
    const day = selectedDay || dayjs(simNow())
    if (day.isSame(dayjs(simNow()), 'day')) return simNow()
    return day.hour(12).minute(0).second(0).millisecond(0).valueOf()
  }
  function addType(typeId: string) {
    setSheetModel({ isNew: true, type: typeId, startedAt: dayBase() })
    setShowPalette(false)
  }
  function detailOf(e: SleepEvent) {
    const unit = typeDef(e.type).amountUnit
    const amt = unit && e.amount != null ? `${e.amount} ${unit}` : ''
    return [amt, e.note].filter(Boolean).join(' · ')
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => { setMonth(month.subtract(1, 'month')); setSelectedDay(null) }} style={[styles.arrow, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{month.format('MMMM YYYY')}</Text>
          <Pressable onPress={() => { setMonth(month.add(1, 'month')); setSelectedDay(null) }} style={[styles.arrow, { backgroundColor: colors.surface }]}>
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <Card>
          <View style={styles.grid}>
            {WEEKDAYS.map(w => (
              <View key={w} style={styles.cell}>
                <Text style={[styles.wd, { color: colors.textSoft }]}>{w}</Text>
              </View>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (c === null) return <View key={i} style={styles.cell} />
              const done = dayDone(c)
              const planned = dayPlanned(c) && !done
              const sel = isSelected(c)
              return (
                <Pressable key={i} style={styles.cell} onPress={() => setSelectedDay(month.date(c))}>
                  <View
                    style={[
                      styles.num,
                      done && { backgroundColor: colors.primarySoft },
                      planned && { borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed' },
                      sel && { borderWidth: 2, borderColor: colors.primary }
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: done || planned ? '800' : '600', color: done ? colors.primary : colors.text }}>{c}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </Card>

        <Card>
          <View style={[s.row, { alignItems: 'center', marginBottom: 8 }]}>
            <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>
              {selectedDay ? selectedDay.format('D MMMM') : 'Сегодня'}
            </Text>
            <Pressable
              onPress={() => {
                animateLayout()
                setShowPalette(v => !v)
              }}
              style={[s.chip, showPalette && s.chipActive]}
            >
              <Text style={[s.chipText, showPalette && s.chipActiveText]}>{showPalette ? '✕' : '＋ Добавить'}</Text>
            </Pressable>
          </View>

          {showPalette && (
            <View style={styles.palette}>
              {CALENDAR_TYPE_LIST.map((t: any) => (
                <Pressable key={t.id} onPress={() => addType(t.id)} style={[styles.paletteBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: '600', color: colors.textSoft, textAlign: 'center' }}>{t.btnLabel || t.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {selectedDay && selectedEvents.length === 0 && (
            <Text style={[s.muted, s.small, { paddingVertical: 4 }]}>В этот день событий нет.</Text>
          )}

          {selectedEvents.map(e => (
            <Pressable key={e.id} onPress={() => setSheetModel(e)} style={[styles.evRow, { borderBottomColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>{typeDef(e.type).icon}</Text>
              <View style={s.grow}>
                <Text style={{ fontWeight: '600', fontSize: 14, color: colors.text }}>
                  {typeDef(e.type).label}
                  {e.planned ? <Text style={[s.muted, s.small]}>  · план</Text> : null}
                </Text>
                {detailOf(e) ? <Text style={[s.muted, s.small]}>{detailOf(e)}</Text> : null}
              </View>
              <Text style={[s.muted, s.small]}>{dayjs(e.startedAt).format('HH:mm')}</Text>
            </Pressable>
          ))}
        </Card>
      </ScrollView>

      <EventEditSheet
        model={sheetModel}
        types={CALENDAR_TYPE_LIST}
        allowPlan
        onClose={() => setSheetModel(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 19, fontWeight: '700', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, minHeight: 44 },
  wd: { fontSize: 11, fontWeight: '600' },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  paletteBtn: { width: '22%', flexGrow: 1, alignItems: 'center', gap: 3, paddingVertical: 8, borderRadius: radiusSm, borderWidth: 1, minHeight: 58, justifyContent: 'center' },
  evRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, minHeight: 52 }
})
