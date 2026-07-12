import React, { useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useEventsStore, useSorted } from '../store/events'
import { useSettlingStore } from '../store/settling'
import { useActiveChild, useChildrenStore } from '../store/children'
import { useNow } from '../time/now'
import { Guidance, GuidancePhase } from '../logic/guidance'
import { sleepVerb } from '../logic/gender'
import { formatDurationMin } from '../logic/age'
import { typeDef, CALENDAR_TYPE_IDS } from '../data/eventTypes'
import { animateLayout } from '../utils/animation'
import { hapticSuccess } from '../utils/haptics'
import { Card, Btn } from './ui'
import WakeChecklist from './WakeChecklist'
import { useTheme } from '../theme/ThemeProvider'
import { radiusSm } from '../theme/colors'

const PHASE_ICON: Record<GuidancePhase, string> = {
  'no-data': '🍼',
  active: '🤸',
  'wind-down': '🌥️',
  'time-to-sleep': '⏰',
  'night-waking': '🌙',
  settling: '🌙',
  'nap-extension': '🔁',
  sleeping: '😴'
}

export default function SettlingFlow({ guidance, onSlept }: { guidance: Guidance; onSlept: () => void }) {
  const { colors } = useTheme()
  const child = useActiveChild()
  const childId = child?.id
  const phase = guidance.phase
  const sleepWord = sleepVerb(child?.gender)
  const [openActivity, setOpenActivity] = useState<number | null>(null)
  const [plansExpanded, setPlansExpanded] = useState(false)

  const now = useNow()
  const events = useSorted()
  const childCount = useChildrenStore(st => st.children.length)

  // Запланированные события календаря активного ребёнка ТОЛЬКО за сегодня.
  const plannedEvents = useMemo(() => {
    if (phase !== 'active') return []
    const dayStart = dayjs(now).startOf('day').valueOf()
    const dayEnd = dayjs(now).endOf('day').valueOf()
    return events
      .filter(e => e.planned && CALENDAR_TYPE_IDS.includes(e.type) && e.startedAt >= dayStart && e.startedAt <= dayEnd)
      .sort((a, b) => a.startedAt - b.startedAt)
  }, [phase, events, now])
  const visiblePlanned = plansExpanded ? plannedEvents : plannedEvents.slice(0, 3)

  // Напоминание за 2 часа (только при нескольких детях)
  const soon = childCount > 1 ? plannedEvents.find(e => e.startedAt >= now && e.startedAt <= now + 2 * 60 * 60 * 1000) : null
  const soonInfo = soon
    ? {
        icon: typeDef(soon.type).icon || '📌',
        label: typeDef(soon.type).label,
        hhmm: dayjs(soon.startedAt).format('HH:mm'),
        inMin: Math.round((soon.startedAt - now) / 60000)
      }
    : null

  const headline = phase === 'active' && plannedEvents.length ? 'Планы' : guidance.headline

  const toneColor = phase === 'time-to-sleep' ? colors.urgent : phase === 'wind-down' || phase === 'settling' ? colors.warn : colors.primary
  const icon = PHASE_ICON[phase] || '💡'

  const settling = useSettlingStore
  function startSettling() {
    if (childId) settling.getState().start(childId)
  }
  function chooseLocation(loc: string) {
    if (childId) settling.getState().setLocation(childId, loc)
  }
  function changeLocation() {
    if (childId) settling.getState().setLocation(childId, null as any)
  }
  async function fellAsleep() {
    if (!childId) return
    hapticSuccess()
    await useEventsStore.getState().startInterval('sleep')
    settling.getState().clear(childId)
    settling.getState().clearExtension(childId)
    onSlept()
  }
  function stopExtension() {
    if (childId) settling.getState().clearExtension(childId)
  }

  return (
    <Card style={[styles.flow, { borderLeftColor: toneColor }]}>
      <View style={styles.head}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{headline}</Text>
      </View>

      {guidance.lines.map((line: string, i: number) => (
        <Text key={i} style={[styles.line, { color: colors.text }]}>
          {line}
        </Text>
      ))}

      {/* Активное время: чем заняться */}
      {guidance.activities.length > 0 && (
        <View style={styles.ideas}>
          <View style={styles.ideaTags}>
            {guidance.activities.map((idea, i) => {
              const active = openActivity === i
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    animateLayout()
                    setOpenActivity(active ? null : i)
                  }}
                  style={[
                    styles.ideaTag,
                    { backgroundColor: active ? colors.primarySoft : colors.surface2, borderColor: active ? colors.primary : colors.border }
                  ]}
                >
                  <Text style={[styles.ideaTagText, { color: colors.primary }]}>{idea.title}</Text>
                </Pressable>
              )
            })}
          </View>
          {openActivity !== null && <Text style={[styles.ideaText, { color: colors.text }]}>{guidance.activities[openActivity].text}</Text>}
        </View>
      )}

      {guidance.wakeChecklist.length > 0 && <WakeChecklist items={guidance.wakeChecklist} wakeSince={guidance.wakeSince} />}

      {/* Напоминание за 2 часа (при нескольких детях) */}
      {soonInfo && (
        <View style={[styles.soon, { backgroundColor: colors.warnSoft, borderColor: colors.warn }]}>
          <Text style={{ color: colors.warn, fontSize: 13, fontWeight: '600' }}>
            🔔 Через ~{formatDurationMin(soonInfo.inMin)}: {soonInfo.icon} {soonInfo.label} ({soonInfo.hhmm}) — планируйте бодрствование.
          </Text>
        </View>
      )}

      {/* Запланированные события календаря на сегодня */}
      {plannedEvents.length > 0 && (
        <View style={styles.planBlock}>
          <Text style={[styles.planCap, { color: colors.textSoft }]}>🗓️ Из календаря на сегодня</Text>
          {visiblePlanned.map(e => (
            <View key={e.id} style={[styles.planLine, { borderBottomColor: colors.border }]}>
              <Text style={{ fontSize: 18 }}>{typeDef(e.type).icon}</Text>
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>
                {typeDef(e.type).label}
                {e.note ? ` · ${e.note}` : ''}
              </Text>
              <Text style={{ fontSize: 13, color: e.startedAt < now ? colors.urgent : colors.textSoft }}>
                {dayjs(e.startedAt).format('D MMM, HH:mm')}
              </Text>
            </View>
          ))}
          {plannedEvents.length > 3 && (
            <Pressable
              onPress={() => {
                animateLayout()
                setPlansExpanded(v => !v)
              }}
              style={{ marginTop: 6 }}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                {plansExpanded ? 'Свернуть' : `Ещё ${plannedEvents.length - 3}`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Продление сна */}
      {phase === 'nap-extension' && (
        <>
          {guidance.steps.length > 0 && <Steps steps={guidance.steps} color={colors.text} />}
          <View style={styles.twoBtn}>
            <Btn title="Начать бодрствование" variant="secondary" onPress={stopExtension} style={styles.grow} />
            <Btn title={sleepWord} onPress={fellAsleep} style={styles.grow} />
          </View>
        </>
      )}

      {guidance.showStartSettling && <Btn title="🌙 Начать укладывание" block onPress={startSettling} style={{ marginTop: 6 }} />}

      {/* Укладывание */}
      {phase === 'settling' && (
        <>
          {!guidance.location ? (
            <View style={styles.locOptions}>
              {guidance.locationOptions.map(loc => (
                <Pressable
                  key={loc.id}
                  onPress={() => chooseLocation(loc.id)}
                  style={[styles.locBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                >
                  <Text style={styles.locIcon}>{loc.icon}</Text>
                  <Text style={[styles.locLabel, { color: colors.text }]}>{loc.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Steps steps={guidance.steps} color={colors.text} />
          )}

          <Btn title={sleepWord} block onPress={fellAsleep} />

          {guidance.location && (
            <Pressable
              onPress={changeLocation}
              style={[styles.backBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Выбрать другое место укладывания"
            >
              <Ionicons name="arrow-back" size={20} color={colors.textSoft} />
            </Pressable>
          )}
        </>
      )}
    </Card>
  )
}

function Steps({ steps, color }: { steps: string[]; color: string }) {
  return (
    <View style={styles.steps}>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={[styles.stepNum, { color }]}>{i + 1}.</Text>
          <Text style={[styles.stepText, { color }]}>{step}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  flow: { borderLeftWidth: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  icon: { fontSize: 24 },
  title: { fontSize: 17, fontWeight: '700' },
  line: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  ideas: { marginVertical: 4, marginBottom: 12 },
  ideaTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ideaTag: { paddingVertical: 7, paddingHorizontal: 14, minHeight: 36, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  ideaTagText: { fontSize: 14, fontWeight: '600' },
  ideaText: { marginTop: 8, fontSize: 14, lineHeight: 21 },
  steps: { marginVertical: 4, marginBottom: 12, gap: 8 },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepNum: { fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  twoBtn: { flexDirection: 'row', gap: 10, marginTop: 8 },
  grow: { flex: 1 },
  locOptions: { gap: 8, marginVertical: 6, marginBottom: 12 },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    borderRadius: radiusSm,
    borderWidth: 1
  },
  locIcon: { fontSize: 22 },
  locLabel: { fontSize: 15, fontWeight: '600' },
  backBtn: { width: 40, height: 40, marginTop: 10, borderRadius: radiusSm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  soon: { marginVertical: 6, padding: 10, borderRadius: radiusSm, borderWidth: 1 },
  planBlock: { marginVertical: 4, marginBottom: 10 },
  planCap: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  planLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1 }
})
