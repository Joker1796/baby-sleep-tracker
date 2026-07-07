import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useEventsStore } from '../store/events'
import { useSettlingStore } from '../store/settling'
import { useActiveChild } from '../store/children'
import { sleepVerb } from '../logic/gender'
import { Card, Btn } from './ui'
import WakeChecklist from './WakeChecklist'
import { useTheme } from '../theme/ThemeProvider'
import { radiusSm } from '../theme/colors'

const PHASE_ICON: Record<string, string> = {
  'no-data': '🍼',
  active: '🤸',
  'wind-down': '🌥️',
  'time-to-sleep': '⏰',
  'night-waking': '🌙',
  settling: '🌙',
  'nap-extension': '🔁',
  sleeping: '😴'
}

export default function SettlingFlow({ guidance, onSlept }: { guidance: any; onSlept: () => void }) {
  const { colors } = useTheme()
  const child = useActiveChild()
  const childId = child?.id
  const phase = guidance.phase
  const sleepWord = sleepVerb(child?.gender)
  const [openActivity, setOpenActivity] = useState<number | null>(null)

  const toneColor =
    phase === 'time-to-sleep' ? colors.urgent : phase === 'wind-down' || phase === 'settling' ? colors.warn : colors.primary
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
        <Text style={[styles.title, { color: colors.text }]}>{guidance.headline}</Text>
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
            {guidance.activities.map((idea: any, i: number) => {
              const active = openActivity === i
              return (
                <Pressable
                  key={i}
                  onPress={() => setOpenActivity(active ? null : i)}
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
          {openActivity !== null && (
            <Text style={[styles.ideaText, { color: colors.text }]}>{guidance.activities[openActivity].text}</Text>
          )}
        </View>
      )}

      {guidance.wakeChecklist.length > 0 && (
        <WakeChecklist items={guidance.wakeChecklist} wakeSince={guidance.wakeSince} />
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

      {guidance.showStartSettling && (
        <Btn title="🌙 Начать укладывание" block onPress={startSettling} style={{ marginTop: 6 }} />
      )}

      {/* Укладывание */}
      {phase === 'settling' && (
        <>
          {!guidance.location ? (
            <View style={styles.locOptions}>
              {guidance.locationOptions.map((loc: any) => (
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
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 52, borderRadius: radiusSm, borderWidth: 1 },
  locIcon: { fontSize: 22 },
  locLabel: { fontSize: 15, fontWeight: '600' },
  backBtn: { width: 40, height: 40, marginTop: 10, borderRadius: radiusSm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
})
