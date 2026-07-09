import React, { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useActiveChild } from '../store/children'
import { useNow } from '../time/now'
import { ageInMonths } from '../logic/age'
import { TIPS, TIP_CATEGORIES, tipsForAge } from '../data/tips'
import { animateLayout } from '../utils/animation'
import { Card } from '../components/ui'
import { useTheme } from '../theme/ThemeProvider'
import { useCommonStyles } from '../theme/commonStyles'

type Block = { isList: boolean; lines: string[] }

function renderBody(body: string): Block[] {
  return body.split('\n\n').map(block => {
    const lines = block.split('\n')
    const isList = lines.every(l => l.startsWith('— ')) && lines.length > 0 && block.startsWith('— ')
    return { isList, lines: isList ? lines.map(l => l.slice(2)) : lines }
  })
}

export default function AdviceScreen() {
  const { colors } = useTheme()
  const s = useCommonStyles()
  const insets = useSafeAreaInsets()
  const child = useActiveChild()
  const now = useNow()

  const [showAllAges, setShowAllAges] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const ageMonths = child ? ageInMonths(child.birthDate, now) : null
  const visibleTips = showAllAges || ageMonths == null ? TIPS : tipsForAge(ageMonths)
  const categories = TIP_CATEGORIES.map((cat: any) => ({
    ...cat,
    tips: visibleTips.filter((t: any) => t.category === cat.id)
  })).filter((cat: any) => cat.tips.length > 0)

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[s.row, { marginBottom: 8 }]}>
          <Text style={[s.cardTitle, s.grow, { marginBottom: 0 }]}>База знаний</Text>
          <Pressable onPress={() => setShowAllAges(v => !v)} style={[s.chip, showAllAges && s.chipActive]}>
            <Text style={[s.chipText, showAllAges && s.chipActiveText]}>
              {showAllAges ? 'Все возрасты' : 'По возрасту'}
            </Text>
          </Pressable>
        </View>

        {categories.map((cat: any) => (
          <View key={cat.id}>
            <Text style={[styles.catTitle, { color: colors.textSoft }]}>
              {cat.icon} {cat.label}
            </Text>
            {cat.tips.map((tip: any) => {
              const expanded = expandedId === tip.id
              return (
                <Card key={tip.id} style={styles.tipCard}>
                  <Pressable
                    style={styles.tipHead}
                    onPress={() => {
                      animateLayout()
                      setExpandedId(expanded ? null : tip.id)
                    }}
                  >
                    <Text style={[styles.tipTitle, s.grow, { color: colors.text }]}>{tip.title}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSoft} />
                  </Pressable>
                  {expanded && (
                    <View style={styles.tipBody}>
                      {renderBody(tip.body).map((block, i) =>
                        block.isList ? (
                          <View key={i} style={{ marginBottom: 8, gap: 4 }}>
                            {block.lines.map((line, j) => (
                              <View key={j} style={styles.bulletRow}>
                                <Text style={{ color: colors.text }}>•</Text>
                                <Text style={[styles.bodyText, { color: colors.text }]}>{line}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text key={i} style={[styles.bodyText, { color: colors.text, marginBottom: 8 }]}>
                            {block.lines.join('\n')}
                          </Text>
                        )
                      )}
                    </View>
                  )}
                </Card>
              )
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  catTitle: { marginTop: 14, marginBottom: 8, marginHorizontal: 2, fontSize: 14 },
  tipCard: { padding: 0, marginBottom: 8, overflow: 'hidden' },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, minHeight: 48 },
  tipTitle: { fontWeight: '600', fontSize: 14.5 },
  tipBody: { paddingHorizontal: 16, paddingBottom: 14 },
  bodyText: { flex: 1, fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 6 }
})
