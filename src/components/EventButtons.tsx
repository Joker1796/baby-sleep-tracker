import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import dayjs from 'dayjs'
import { useEventsStore, useSorted, selectOpenInterval, SleepEvent } from '../store/events'
import { useActiveChild, MainButton } from '../store/children'
import { useNow, simNow } from '../time/now'
import { formatDurationMin, ageInMonths } from '../logic/age'
import { poopVerb } from '../logic/gender'
import { dayCount } from '../logic/eventStats'
import { typeDef, MAIN_BUTTON_TYPE_LIST, FEEDING_TYPE_IDS, getMainButtons } from '../data/eventTypes'
import { hapticTap } from '../utils/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { eventColors } from '../theme/eventColor'
import { radiusSm } from '../theme/colors'

export default function EventButtons({ onLogged, onEdit }: { onLogged: (msg: string) => void; onEdit: (model: any) => void }) {
  const { colors } = useTheme()
  const child = useActiveChild()
  const now = useNow()
  const events = useSorted()

  const ageM = child?.birthDate ? ageInMonths(child.birthDate, now) : null
  const mainIds = new Set(MAIN_BUTTON_TYPE_LIST.map((t: any) => t.id))
  const feedingSet = new Set(FEEDING_TYPE_IDS)

  // Кнопки главного: только выбранные и доступные по возрасту; кормление первым.
  const list: MainButton[] = getMainButtons(child).filter(
    (b: MainButton) => mainIds.has(b.type) && (ageM == null || typeDef(b.type).minAgeM == null || ageM >= typeDef(b.type).minAgeM)
  )
  const feeds = FEEDING_TYPE_IDS.map((id: string) => list.find(b => b.type === id)).filter(Boolean) as MainButton[]
  const rest = list.filter(b => !feedingSet.has(b.type))
  const mainButtons = [...feeds, ...rest]

  const typeOf = typeDef
  const openOf = (b: MainButton) => (b.mode === 'time' ? selectOpenInterval(events, b.type) : null)
  const elapsed = (ev: SleepEvent) => formatDurationMin((now - ev.startedAt) / 60000)
  const countToday = (t: string) => dayCount(events, t, dayjs(now).startOf('day').valueOf())

  function labelOf(b: MainButton) {
    const def = typeOf(b.type)
    if (b.mode === 'time') {
      const open = openOf(b)
      if (open) return `${def.activeLabel || def.btnLabel || def.label} ${elapsed(open)}`
      return def.btnLabel || def.label
    }
    const base = b.type === 'poop' ? poopVerb(child?.gender) : def.btnLabel || def.label
    const n = countToday(b.type)
    return n > 0 ? `${base} (${n})` : base
  }

  async function onClick(b: MainButton) {
    const def = typeOf(b.type)
    if (def.amountUnit || def.hasNote) {
      onEdit({ isNew: true, type: b.type, startedAt: simNow() })
      return
    }
    hapticTap()
    const store = useEventsStore.getState()
    if (b.mode === 'time') {
      const open = selectOpenInterval(events, b.type)
      if (open) {
        await store.endInterval(open)
        onLogged(`Закончили: ${def.btnLabel || def.label}`)
      } else {
        await store.startInterval(b.type)
        onLogged(`Начали: ${def.btnLabel || def.label}`)
      }
    } else {
      await store.addPoint(b.type)
      onLogged(`Отмечено ${def.icon}`)
    }
  }

  return (
    <View style={styles.grid}>
      {mainButtons.map(b => {
        const def = typeOf(b.type)
        const { color, soft } = eventColors(colors, b.type)
        const on = !!openOf(b)
        return (
          <Pressable
            key={b.type}
            onPress={() => onClick(b)}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: on ? soft : colors.surface },
              on && { borderWidth: 1.5, borderColor: color },
              pressed && { opacity: 0.75 }
            ]}
          >
            <Text style={styles.icon}>{def.icon}</Text>
            <Text style={[styles.label, { color }]}>{labelOf(b)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  btn: {
    width: '31.5%',
    flexGrow: 1,
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
