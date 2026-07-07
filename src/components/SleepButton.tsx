import React, { useState } from 'react'
import { Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useEventsStore, useCurrentSleep } from '../store/events'
import { useActiveChild } from '../store/children'
import { sleepVerb, wakeVerb } from '../logic/gender'
import { useTheme } from '../theme/ThemeProvider'
import { radius } from '../theme/colors'

export default function SleepButton() {
  const { colors } = useTheme()
  const child = useActiveChild()
  const sleeping = useCurrentSleep()
  const [busy, setBusy] = useState(false)

  const wakeWord = wakeVerb(child?.gender)
  const sleepWord = sleepVerb(child?.gender)

  async function toggle() {
    if (busy) return
    setBusy(true)
    try {
      const store = useEventsStore.getState()
      if (sleeping) await store.endInterval(sleeping)
      else await store.startInterval('sleep')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Pressable
      disabled={busy}
      onPress={toggle}
      style={({ pressed }) => [
        styles.btn,
        sleeping
          ? { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.sleep }
          : { backgroundColor: colors.sleep },
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
      <Ionicons
        name={sleeping ? 'sunny' : 'moon'}
        size={30}
        color={sleeping ? colors.sleep : '#fff'}
      />
      <Text style={[styles.main, { color: sleeping ? colors.text : '#fff' }]}>
        {sleeping ? wakeWord : sleepWord}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    minHeight: 72,
    borderRadius: radius,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  icon: { fontSize: 30 },
  main: { fontSize: 17, fontWeight: '700' }
})
