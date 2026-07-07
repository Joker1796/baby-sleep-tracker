import React from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useChildrenStore } from '../store/children'
import { formatAge } from '../logic/age'
import { useNow } from '../time/now'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

export default function ChildSwitcher() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const now = useNow()
  const children = useChildrenStore(st => st.children)
  const activeChildId = useChildrenStore(st => st.activeChildId)
  const setActive = useChildrenStore(st => st.setActive)
  const activeId = activeChildId || children[0]?.id

  if (children.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      {children.map(child => {
        const active = activeId === child.id
        return (
          <Pressable
            key={child.id}
            onPress={() => setActive(child.id)}
            style={[s.chip, active && s.chipActive]}
          >
            <View style={[styles.dot, { backgroundColor: child.color }]} />
            <Text style={[s.chipText, active && s.chipActiveText]}>{child.name}</Text>
            <Text style={[styles.age, { color: active ? colors.primary : colors.textSoft }]}>
              {formatAge(child.birthDate, now)}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  row: { gap: 8, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  age: { fontSize: 12 }
})
