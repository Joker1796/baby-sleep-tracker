import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useEventsStore, useSorted } from '../store/events'
import { useNow } from '../time/now'
import { typeDef } from '../data/eventTypes'
import { ChecklistItem } from '../logic/guidance'
import { hapticTap } from '../utils/haptics'
import { useTheme } from '../theme/ThemeProvider'
import { radiusSm } from '../theme/colors'

export default function WakeChecklist({
  items,
  wakeSince
}: {
  items: ChecklistItem[]
  wakeSince: number | null
}) {
  const { colors } = useTheme()
  const now = useNow()
  const events = useSorted()

  function eventsFor(item: ChecklistItem) {
    return events.filter(e => {
      if (e.type !== item.type) return false
      if (item.scope === 'wake' && wakeSince != null) return e.startedAt >= wakeSince
      return dayjs(e.startedAt).isSame(dayjs(now), 'day')
    })
  }

  const rows = items.map(item => {
    const matched = eventsFor(item)
    return {
      ...item,
      icon: typeDef(item.type).icon || '•',
      done: matched.length > 0,
      lastId: matched.length ? matched[matched.length - 1].id : null
    }
  })

  async function toggle(row: (typeof rows)[number]) {
    hapticTap()
    const store = useEventsStore.getState()
    if (row.done && row.lastId) await store.remove(row.lastId)
    else await store.addPoint(row.type)
  }

  return (
    <View style={styles.list}>
      {rows.map(row => (
        <Pressable
          key={row.id}
          onPress={() => toggle(row)}
          style={[
            styles.row,
            { backgroundColor: row.done ? colors.walkSoft : colors.surface2, borderColor: row.done ? colors.walk : colors.border }
          ]}
        >
          <Text style={styles.icon}>{row.icon}</Text>
          <Text style={[styles.label, { color: colors.text }]}>{row.label}</Text>
          <View
            style={[
              styles.check,
              { borderColor: row.done ? colors.walk : colors.border, backgroundColor: row.done ? colors.walk : colors.surface }
            ]}
          >
            {row.done && <Ionicons name="checkmark" size={18} color="#fff" />}
          </View>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 6, marginTop: 6, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 48,
    borderRadius: radiusSm,
    borderWidth: 1
  },
  icon: { fontSize: 18 },
  label: { flex: 1, fontSize: 14 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkMark: { fontWeight: '800', color: '#fff' }
})
