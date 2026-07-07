import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useEventsStore, useSorted, selectOpenInterval, SleepEvent } from '../store/events'
import { useActiveChild } from '../store/children'
import { useNow } from '../time/now'
import { formatDurationMin } from '../logic/age'
import { poopVerb } from '../logic/gender'
import { useTheme } from '../theme/ThemeProvider'
import { radiusSm } from '../theme/colors'

export default function EventButtons({ onLogged }: { onLogged: (msg: string) => void }) {
  const { colors } = useTheme()
  const child = useActiveChild()
  const now = useNow()
  const events = useSorted()

  const poopWord = poopVerb(child?.gender)
  const tummy = selectOpenInterval(events, 'tummy')
  const bath = selectOpenInterval(events, 'bath')

  const elapsed = (ev: SleepEvent) => formatDurationMin((now - ev.startedAt) / 60000)

  async function toggleInterval(
    type: string,
    active: SleepEvent | null,
    startMsg: string,
    endMsg: string
  ) {
    const store = useEventsStore.getState()
    if (active) {
      await store.endInterval(active)
      onLogged(endMsg)
    } else {
      await store.startInterval(type)
      onLogged(startMsg)
    }
  }

  async function logPoop() {
    await useEventsStore.getState().addPoint('poop')
    onLogged('Отмечено 💩')
  }

  return (
    <View style={styles.grid}>
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: tummy ? colors.primarySoft : colors.surface },
          tummy && { borderWidth: 1.5, borderColor: colors.primary },
          pressed && { opacity: 0.75 }
        ]}
        onPress={() => toggleInterval('tummy', tummy, 'Выкладывание началось', 'Выкладывание завершено')}
      >
        <Text style={styles.icon}>👶</Text>
        <Text style={[styles.label, { color: colors.primary }]}>
          {tummy ? `Живот ${elapsed(tummy)}` : 'Выкладывание'}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: bath ? colors.bathSoft : colors.surface },
          bath && { borderWidth: 1.5, borderColor: colors.bath },
          pressed && { opacity: 0.75 }
        ]}
        onPress={() => toggleInterval('bath', bath, 'Купание началось', 'Купание завершено')}
      >
        <Text style={styles.icon}>🛁</Text>
        <Text style={[styles.label, { color: colors.bath }]}>
          {bath ? `Купаемся ${elapsed(bath)}` : 'Купание'}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.btn, { backgroundColor: colors.surface }, pressed && { opacity: 0.75 }]}
        onPress={logPoop}
      >
        <Text style={styles.icon}>💩</Text>
        <Text style={[styles.label, { color: colors.walk }]}>{poopWord}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    minHeight: 64,
    borderRadius: radiusSm,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  icon: { fontSize: 22 },
  label: { fontSize: 12.5, fontWeight: '600', textAlign: 'center' }
})
