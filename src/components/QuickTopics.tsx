import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { QUICK_TOPICS } from '../data/quickTopics'
import { Card } from './ui'
import { useTheme } from '../theme/ThemeProvider'

export default function QuickTopics() {
  const { colors } = useTheme()
  const [openId, setOpenId] = useState<string | null>(null)
  const open = QUICK_TOPICS.find((t: any) => t.id === openId)

  return (
    <View style={styles.wrap}>
      <View style={styles.tags}>
        {QUICK_TOPICS.map((t: any) => {
          const active = openId === t.id
          return (
            <Pressable
              key={t.id}
              onPress={() => setOpenId(active ? null : t.id)}
              style={[
                styles.tag,
                { backgroundColor: active ? colors.primarySoft : colors.surface2, borderColor: active ? colors.primary : colors.border }
              ]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>{t.tag}</Text>
            </Pressable>
          )
        })}
      </View>
      {open ? (
        <Card style={styles.topicText}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{open.text}</Text>
        </Card>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingVertical: 7, paddingHorizontal: 14, minHeight: 36, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  tagText: { fontSize: 14, fontWeight: '600' },
  topicText: { marginTop: 8, marginBottom: 0 }
})
